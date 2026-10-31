"""Billing engine: period math, pricing, discounts, taxes, and idempotent invoicing.

The single rule that matters most here: a subscription period is billed exactly
once. `generate_invoice_for_subscription` is safe to call repeatedly (e.g. on a
nightly billing run) and will never create a duplicate invoice for the same
period, nor skip a due period.
"""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models import (
    BillingPeriod,
    Discount,
    DiscountScope,
    DiscountType,
    Invoice,
    InvoiceLine,
    InvoiceStatus,
    Subscription,
    SubscriptionStatus,
)

ZERO = Decimal("0.00")


def _period_delta(period: BillingPeriod) -> timedelta:
    return {
        BillingPeriod.daily: timedelta(days=1),
        BillingPeriod.weekly: timedelta(weeks=1),
        BillingPeriod.monthly: timedelta(days=30),
        BillingPeriod.yearly: timedelta(days=365),
    }[period]


def period_end_for(start: date, period: BillingPeriod) -> date:
    return start + _period_delta(period) - timedelta(days=1)


def _dec(value) -> Decimal:
    return Decimal(str(value or 0))


def _next_invoice_number(db: Session) -> str:
    count = db.scalar(select(func.count()).select_from(Invoice)) or 0
    return f"INV-{count + 1:06d}"


def _applicable_discounts(db: Session, on_date: date, product_id: int | None) -> list[Discount]:
    """Return active, in-window, not-exhausted discounts for a product/subscription."""
    stmt = select(Discount).where(Discount.active.is_(True))
    discounts = db.scalars(stmt).all()

    result: list[Discount] = []
    for d in discounts:
        if d.start_date and on_date < d.start_date:
            continue
        if d.end_date and on_date > d.end_date:
            continue
        if d.usage_limit and d.times_used >= d.usage_limit:
            continue
        if d.scope == DiscountScope.product and d.product_id != product_id:
            continue
        result.append(d)
    return result


def compute_line_amounts(quantity: int, unit_price, tax_rate_percent: float) -> dict:
    """Pure pricing helper for a single line. Returns net, tax, and gross."""
    net = _dec(unit_price) * Decimal(quantity)
    tax = (net * _dec(tax_rate_percent) / Decimal(100)).quantize(Decimal("0.01"))
    return {
        "net": net.quantize(Decimal("0.01")),
        "tax": tax,
        "gross": (net + tax).quantize(Decimal("0.01")),
    }


def generate_invoice_for_subscription(
    db: Session, subscription: Subscription, as_of: date | None = None
) -> Invoice | None:
    """Create the next due invoice for a subscription, or None if nothing is due.

    Idempotent: relies on a unique (subscription_id, period_start) constraint and
    the subscription's last_billed_date cursor so a period is never billed twice.
    """
    as_of = as_of or date.today()

    if subscription.status not in (SubscriptionStatus.confirmed, SubscriptionStatus.active):
        return None
    if not subscription.start_date:
        return None

    # Determine the next period to bill.
    if subscription.last_billed_date is None:
        period_start = subscription.start_date
    else:
        period_start = subscription.last_billed_date + timedelta(days=1)

    if period_start > as_of:
        return None  # Not due yet.
    if subscription.expiry_date and period_start > subscription.expiry_date:
        return None  # Past the subscription's life.

    period = subscription.plan.billing_period
    period_end = period_end_for(period_start, period)

    # Build invoice + lines in memory first.
    invoice = Invoice(
        number=_next_invoice_number(db),
        subscription_id=subscription.id,
        customer_id=subscription.customer_id,
        status=InvoiceStatus.draft,
        issue_date=as_of,
        due_date=as_of + timedelta(days=subscription.payment_terms_days),
        period_start=period_start,
        period_end=period_end,
    )

    subtotal = ZERO
    tax_total = ZERO
    discount_total = ZERO
    used_discounts: list[Discount] = []

    for line in subscription.lines:
        base_price = _dec(line.unit_price)
        if line.variant:
            base_price += _dec(line.variant.price_extra)

        net = base_price * Decimal(line.quantity)

        # Apply the best single applicable discount for this line.
        discounts = _applicable_discounts(db, as_of, line.product_id)
        best = _best_discount(discounts, net, line.quantity)
        line_discount = ZERO
        if best is not None:
            line_discount = _discount_amount(best, net)
            used_discounts.append(best)

        net_after = net - line_discount
        tax_rate = line.tax.rate_percent if line.tax else 0
        line_tax = (net_after * _dec(tax_rate) / Decimal(100)).quantize(Decimal("0.01"))

        invoice.lines.append(
            InvoiceLine(
                description=line.description or (line.product.name if line.product else "Item"),
                quantity=line.quantity,
                unit_price=base_price,
                tax_rate=tax_rate,
                line_total=(net_after + line_tax).quantize(Decimal("0.01")),
            )
        )

        subtotal += net
        discount_total += line_discount
        tax_total += line_tax

    invoice.subtotal = subtotal.quantize(Decimal("0.01"))
    invoice.discount_total = discount_total.quantize(Decimal("0.01"))
    invoice.tax_total = tax_total.quantize(Decimal("0.01"))
    invoice.total = (subtotal - discount_total + tax_total).quantize(Decimal("0.01"))

    db.add(invoice)
    try:
        db.flush()  # Trigger the unique constraint before we mutate counters.
    except IntegrityError:
        db.rollback()
        return None  # Another run already billed this period.

    # Advance the billing cursor and bump discount usage counters.
    subscription.last_billed_date = period_end
    if subscription.status == SubscriptionStatus.confirmed:
        subscription.status = SubscriptionStatus.active
    for d in set(used_discounts):
        d.times_used += 1

    db.commit()
    db.refresh(invoice)
    return invoice


def run_billing_cycle(db: Session, as_of: date | None = None) -> list[Invoice]:
    """Generate all due invoices across every active/confirmed subscription."""
    as_of = as_of or date.today()
    subs = db.scalars(
        select(Subscription)
        .where(Subscription.status.in_([SubscriptionStatus.confirmed, SubscriptionStatus.active]))
        .options(selectinload(Subscription.lines), selectinload(Subscription.plan))
    ).all()

    created: list[Invoice] = []
    for sub in subs:
        # A subscription may have several periods due (e.g. after a gap); bill each.
        while True:
            inv = generate_invoice_for_subscription(db, sub, as_of)
            if inv is None:
                break
            created.append(inv)
    return created


def _best_discount(discounts: list[Discount], net: Decimal, quantity: int) -> Discount | None:
    """Pick the discount that reduces the line the most, honoring min thresholds."""
    best: Discount | None = None
    best_amount = ZERO
    for d in discounts:
        if d.min_purchase and net < _dec(d.min_purchase):
            continue
        if d.min_quantity and quantity < d.min_quantity:
            continue
        amount = _discount_amount(d, net)
        if amount > best_amount:
            best_amount = amount
            best = d
    return best


def _discount_amount(discount: Discount, net: Decimal) -> Decimal:
    if discount.discount_type == DiscountType.percentage:
        return (net * _dec(discount.value) / Decimal(100)).quantize(Decimal("0.01"))
    return min(_dec(discount.value), net).quantize(Decimal("0.01"))
