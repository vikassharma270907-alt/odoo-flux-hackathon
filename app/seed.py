"""Seed a default admin and a demo dataset so the app is usable immediately.

The dataset is designed so the finance dashboard shows meaningful numbers on
first load: active subscriptions, collected revenue, outstanding balances, and
genuinely overdue invoices (past due date, still unpaid).

Ordering is deliberate and relied upon by the test suite:
- user id=1 is the admin, id=2 is customer@acme.com
- subscription id=1 is SUB-000001: confirmed, NOT yet billed, with the Odoo
  variant so its first invoice totals 3681.60 (2 * (1000 + 560) * 1.18).
"""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models import (
    BillingPeriod,
    Discount,
    DiscountScope,
    DiscountType,
    Invoice,
    InvoiceLine,
    InvoiceStatus,
    Payment,
    Plan,
    Product,
    ProductVariant,
    Role,
    Subscription,
    SubscriptionLine,
    SubscriptionStatus,
    Tax,
    User,
)
from app.security import hash_password

DEFAULT_ADMIN_EMAIL = "admin@brightloop.io"
DEFAULT_ADMIN_PASSWORD = "Admin@1234"  # meets policy; change in production

TODAY = date.today()


def _line_total(quantity: int, unit_price, tax_rate: float) -> Decimal:
    net = Decimal(str(unit_price)) * Decimal(quantity)
    tax = (net * Decimal(str(tax_rate)) / Decimal(100)).quantize(Decimal("0.01"))
    return (net + tax).quantize(Decimal("0.01"))


def _add_invoice(
    db: Session,
    *,
    number: str,
    sub: Subscription,
    tax_rate: float,
    quantity: int,
    unit_price,
    status: InvoiceStatus,
    issue_offset: int,
    due_offset: int,
    paid: bool,
) -> None:
    """Create a fully-formed invoice (with a line) for the demo dataset."""
    net = (Decimal(str(unit_price)) * Decimal(quantity)).quantize(Decimal("0.01"))
    tax_total = (net * Decimal(str(tax_rate)) / Decimal(100)).quantize(Decimal("0.01"))
    total = (net + tax_total).quantize(Decimal("0.01"))

    invoice = Invoice(
        number=number,
        subscription_id=sub.id,
        customer_id=sub.customer_id,
        status=status,
        issue_date=TODAY + timedelta(days=issue_offset),
        due_date=TODAY + timedelta(days=due_offset),
        period_start=TODAY + timedelta(days=issue_offset),
        period_end=TODAY + timedelta(days=issue_offset + 29),
        subtotal=net,
        discount_total=Decimal("0.00"),
        tax_total=tax_total,
        total=total,
        amount_paid=total if paid else Decimal("0.00"),
    )
    invoice.lines.append(
        InvoiceLine(
            description="Brightloop subscription",
            quantity=quantity,
            unit_price=unit_price,
            tax_rate=tax_rate,
            line_total=_line_total(quantity, unit_price, tax_rate),
        )
    )
    db.add(invoice)
    db.flush()

    if paid:
        db.add(
            Payment(
                invoice_id=invoice.id,
                method="bank_transfer",
                amount=float(total),
                paid_on=TODAY + timedelta(days=due_offset - 2),
                note="Demo payment",
            )
        )


def seed(db: Session) -> None:
    if db.query(User).filter(User.email == DEFAULT_ADMIN_EMAIL).first():
        return  # Already seeded.

    # --- Users (order matters: admin=1, acme customer=2) ---
    admin = User(
        email=DEFAULT_ADMIN_EMAIL,
        hashed_password=hash_password(DEFAULT_ADMIN_PASSWORD),
        full_name="Brightloop Admin",
        role=Role.admin,
    )
    customer = User(
        email="customer@acme.com",
        hashed_password=hash_password("Customer@123"),
        full_name="Acme Corp",
        role=Role.customer,
    )
    staff = User(
        email="staff@brightloop.io",
        hashed_password=hash_password("Staff@1234"),
        full_name="Brightloop Staff",
        role=Role.staff,
    )
    globex = User(
        email="finance@globex.com",
        hashed_password=hash_password("Globex@123"),
        full_name="Globex Inc",
        role=Role.customer,
    )
    initech = User(
        email="ap@initech.com",
        hashed_password=hash_password("Initech@123"),
        full_name="Initech LLC",
        role=Role.customer,
    )
    db.add_all([admin, customer, staff, globex, initech])
    db.flush()

    # --- Catalog ---
    tax = Tax(name="GST 18%", rate_percent=18)
    product = Product(
        name="Brightloop Pro", product_type="software", sales_price=1000, cost_price=300,
        notes="Flagship product",
    )
    product.variants.append(ProductVariant(name="Odoo brand", price_extra=560))

    addon = Product(
        name="Priority Support", product_type="service", sales_price=500, cost_price=100,
        notes="Optional add-on",
    )
    db.add_all([tax, product, addon])
    db.flush()

    plan_monthly = Plan(
        name="Pro Monthly", product_id=product.id, price=1000,
        billing_period=BillingPeriod.monthly, minimum_quantity=1,
        auto_close_on_end=False, allow_close_early=True, allow_pause=True, allow_renew=True,
    )
    plan_yearly = Plan(
        name="Pro Yearly", product_id=product.id, price=10000,
        billing_period=BillingPeriod.yearly, minimum_quantity=1,
        auto_close_on_end=True, allow_close_early=False, allow_pause=False, allow_renew=True,
    )
    db.add_all([plan_monthly, plan_yearly])
    db.flush()

    # --- Discount rules (admin-created) ---
    # Scoped to the Priority Support add-on so it auto-applies to SUB-000004's
    # next invoice during the demo, without affecting SUB-000001's total.
    addon_discount = Discount(
        name="Support 20% off",
        discount_type=DiscountType.percentage,
        value=20,
        scope=DiscountScope.product,
        product_id=addon.id,
        min_quantity=1,
        start_date=TODAY - timedelta(days=30),
        end_date=TODAY + timedelta(days=60),
        usage_limit=0,  # unlimited
        active=True,
    )
    # A flat discount that has already expired — shows the "stops when it
    # expires" rule and will NOT be applied.
    expired_discount = Discount(
        name="Launch ₹100 off (expired)",
        discount_type=DiscountType.fixed,
        value=100,
        scope=DiscountScope.product,
        product_id=addon.id,
        start_date=TODAY - timedelta(days=120),
        end_date=TODAY - timedelta(days=30),
        usage_limit=0,
        active=True,
    )
    # A future volume discount — valid later, not yet active.
    future_discount = Discount(
        name="Volume 10% (starts next month)",
        discount_type=DiscountType.percentage,
        value=10,
        scope=DiscountScope.subscription,
        product_id=None,
        min_quantity=5,
        start_date=TODAY + timedelta(days=30),
        end_date=TODAY + timedelta(days=120),
        usage_limit=50,
        active=True,
    )
    db.add_all([addon_discount, expired_discount, future_discount])
    db.flush()

    # --- Subscription id=1: confirmed, NOT billed (drives the invoice tests) ---
    sub1 = Subscription(
        number="SUB-000001",
        customer_id=customer.id,
        plan_id=plan_monthly.id,
        status=SubscriptionStatus.confirmed,
        start_date=TODAY - timedelta(days=1),
        expiry_date=TODAY + timedelta(days=365),
        payment_terms_days=15,
    )
    sub1.lines.append(
        SubscriptionLine(
            product_id=product.id,
            variant_id=product.variants[0].id,
            tax_id=tax.id,
            description="Brightloop Pro (Odoo brand)",
            quantity=2,
            unit_price=1000,
        )
    )
    db.add(sub1)

    # --- Active subscriptions for the other customers (already billed history) ---
    sub2 = Subscription(
        number="SUB-000002",
        customer_id=globex.id,
        plan_id=plan_yearly.id,
        status=SubscriptionStatus.active,
        start_date=TODAY - timedelta(days=120),
        expiry_date=TODAY + timedelta(days=245),
        payment_terms_days=30,
        last_billed_date=TODAY - timedelta(days=1),
    )
    sub2.lines.append(
        SubscriptionLine(
            product_id=product.id, tax_id=tax.id,
            description="Brightloop Pro Yearly", quantity=1, unit_price=10000,
        )
    )
    sub3 = Subscription(
        number="SUB-000003",
        customer_id=initech.id,
        plan_id=plan_monthly.id,
        status=SubscriptionStatus.active,
        start_date=TODAY - timedelta(days=90),
        expiry_date=TODAY + timedelta(days=275),
        payment_terms_days=15,
        last_billed_date=TODAY - timedelta(days=1),
    )
    sub3.lines.append(
        SubscriptionLine(
            product_id=product.id, tax_id=tax.id,
            description="Brightloop Pro Monthly", quantity=3, unit_price=1000,
        )
    )
    sub4 = Subscription(
        number="SUB-000004",
        customer_id=customer.id,
        plan_id=plan_monthly.id,
        status=SubscriptionStatus.active,
        start_date=TODAY - timedelta(days=60),
        expiry_date=TODAY + timedelta(days=305),
        payment_terms_days=15,
        last_billed_date=TODAY - timedelta(days=1),
    )
    sub4.lines.append(
        SubscriptionLine(
            product_id=addon.id, tax_id=tax.id,
            description="Priority Support", quantity=1, unit_price=500,
        )
    )
    db.add_all([sub2, sub3, sub4])
    db.flush()

    # --- Invoices: a mix of paid, outstanding (confirmed), and overdue ---
    # Paid — contributes to collected revenue.
    _add_invoice(
        db, number="INV-000001", sub=sub2, tax_rate=18, quantity=1, unit_price=10000,
        status=InvoiceStatus.paid, issue_offset=-120, due_offset=-90, paid=True,
    )
    _add_invoice(
        db, number="INV-000002", sub=sub3, tax_rate=18, quantity=3, unit_price=1000,
        status=InvoiceStatus.paid, issue_offset=-90, due_offset=-75, paid=True,
    )
    # Outstanding — confirmed, due in the future, not yet paid.
    _add_invoice(
        db, number="INV-000003", sub=sub4, tax_rate=18, quantity=1, unit_price=500,
        status=InvoiceStatus.confirmed, issue_offset=-5, due_offset=10, paid=False,
    )
    # Overdue — confirmed, due date in the past, still unpaid.
    _add_invoice(
        db, number="INV-000004", sub=sub3, tax_rate=18, quantity=3, unit_price=1000,
        status=InvoiceStatus.confirmed, issue_offset=-40, due_offset=-10, paid=False,
    )
    _add_invoice(
        db, number="INV-000005", sub=sub2, tax_rate=18, quantity=1, unit_price=10000,
        status=InvoiceStatus.confirmed, issue_offset=-50, due_offset=-20, paid=False,
    )

    db.commit()
