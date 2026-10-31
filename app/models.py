"""SQLAlchemy ORM models for the Brightloop subscription domain.

Status/date columns and foreign keys are indexed to keep list and report
queries under the 2-second target with thousands of subscriptions.
"""
from __future__ import annotations

import enum
from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# --------------------------------------------------------------------------- #
# Enums
# --------------------------------------------------------------------------- #
class Role(str, enum.Enum):
    admin = "admin"
    staff = "staff"
    customer = "customer"


class BillingPeriod(str, enum.Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"
    yearly = "yearly"


class SubscriptionStatus(str, enum.Enum):
    draft = "draft"
    quotation = "quotation"
    confirmed = "confirmed"
    active = "active"
    paused = "paused"
    closed = "closed"


class InvoiceStatus(str, enum.Enum):
    draft = "draft"
    confirmed = "confirmed"
    paid = "paid"
    cancelled = "cancelled"


class DiscountType(str, enum.Enum):
    fixed = "fixed"
    percentage = "percentage"


class DiscountScope(str, enum.Enum):
    product = "product"
    subscription = "subscription"


# --------------------------------------------------------------------------- #
# Users & auth
# --------------------------------------------------------------------------- #
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), default="")
    role: Mapped[Role] = mapped_column(Enum(Role), default=Role.customer, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    reset_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reset_token_expires: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    subscriptions: Mapped[list[Subscription]] = relationship(back_populates="customer")


# --------------------------------------------------------------------------- #
# Catalog: products, variants, plans, taxes
# --------------------------------------------------------------------------- #
class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    product_type: Mapped[str] = mapped_column(String(100), default="service")
    sales_price: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    cost_price: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    notes: Mapped[str] = mapped_column(Text, default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    variants: Mapped[list[ProductVariant]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    plans: Mapped[list[Plan]] = relationship(back_populates="product")


class ProductVariant(Base):
    """A variant (e.g. by brand) that adjusts the base price."""

    __tablename__ = "product_variants"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # e.g. "Odoo brand"
    price_extra: Mapped[float] = mapped_column(Numeric(12, 2), default=0)  # e.g. 560

    product: Mapped[Product] = relationship(back_populates="variants")


class Tax(Base):
    __tablename__ = "taxes"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    rate_percent: Mapped[float] = mapped_column(Float, default=0)  # e.g. 18 for 18%
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), index=True, nullable=True)
    price: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    billing_period: Mapped[BillingPeriod] = mapped_column(Enum(BillingPeriod), default=BillingPeriod.monthly)
    minimum_quantity: Mapped[int] = mapped_column(Integer, default=1)
    available_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    available_to: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Per-plan lifecycle flags set by the admin.
    auto_close_on_end: Mapped[bool] = mapped_column(Boolean, default=False)
    allow_close_early: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_pause: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_renew: Mapped[bool] = mapped_column(Boolean, default=True)

    product: Mapped[Product | None] = relationship(back_populates="plans")


# --------------------------------------------------------------------------- #
# Quotation templates
# --------------------------------------------------------------------------- #
class QuotationTemplate(Base):
    __tablename__ = "quotation_templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    plan_id: Mapped[int | None] = mapped_column(ForeignKey("plans.id"), nullable=True)
    valid_for_days: Mapped[int] = mapped_column(Integer, default=30)

    lines: Mapped[list[QuotationTemplateLine]] = relationship(
        back_populates="template", cascade="all, delete-orphan"
    )


class QuotationTemplateLine(Base):
    __tablename__ = "quotation_template_lines"

    id: Mapped[int] = mapped_column(primary_key=True)
    template_id: Mapped[int] = mapped_column(ForeignKey("quotation_templates.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[int] = mapped_column(Integer, default=1)

    template: Mapped[QuotationTemplate] = relationship(back_populates="lines")


# --------------------------------------------------------------------------- #
# Subscriptions
# --------------------------------------------------------------------------- #
class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("plans.id"), index=True)
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus), default=SubscriptionStatus.draft, index=True
    )
    start_date: Mapped[date | None] = mapped_column(Date, index=True, nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, index=True, nullable=True)
    payment_terms_days: Mapped[int] = mapped_column(Integer, default=15)
    # Tracks the last period boundary that was billed, to keep billing idempotent.
    last_billed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    customer: Mapped[User] = relationship(back_populates="subscriptions")
    plan: Mapped[Plan] = relationship()
    lines: Mapped[list[SubscriptionLine]] = relationship(
        back_populates="subscription", cascade="all, delete-orphan"
    )
    invoices: Mapped[list[Invoice]] = relationship(back_populates="subscription")


class SubscriptionLine(Base):
    __tablename__ = "subscription_lines"

    id: Mapped[int] = mapped_column(primary_key=True)
    subscription_id: Mapped[int] = mapped_column(ForeignKey("subscriptions.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    variant_id: Mapped[int | None] = mapped_column(ForeignKey("product_variants.id"), nullable=True)
    tax_id: Mapped[int | None] = mapped_column(ForeignKey("taxes.id"), nullable=True)
    description: Mapped[str] = mapped_column(String(255), default="")
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), default=0)

    subscription: Mapped[Subscription] = relationship(back_populates="lines")
    product: Mapped[Product] = relationship()
    variant: Mapped[ProductVariant | None] = relationship()
    tax: Mapped[Tax | None] = relationship()


# --------------------------------------------------------------------------- #
# Discounts
# --------------------------------------------------------------------------- #
class Discount(Base):
    __tablename__ = "discounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    discount_type: Mapped[DiscountType] = mapped_column(Enum(DiscountType), default=DiscountType.percentage)
    value: Mapped[float] = mapped_column(Numeric(12, 2), default=0)  # % or fixed amount
    scope: Mapped[DiscountScope] = mapped_column(Enum(DiscountScope), default=DiscountScope.subscription)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), nullable=True)
    min_purchase: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    min_quantity: Mapped[int] = mapped_column(Integer, default=0)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    usage_limit: Mapped[int] = mapped_column(Integer, default=0)  # 0 = unlimited
    times_used: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


# --------------------------------------------------------------------------- #
# Invoices & payments
# --------------------------------------------------------------------------- #
class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (
        # One invoice per subscription per billing period — enforces idempotent billing.
        UniqueConstraint("subscription_id", "period_start", name="uq_invoice_period"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    subscription_id: Mapped[int] = mapped_column(ForeignKey("subscriptions.id"), index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus), default=InvoiceStatus.draft, index=True
    )
    issue_date: Mapped[date] = mapped_column(Date, index=True, default=date.today)
    due_date: Mapped[date | None] = mapped_column(Date, index=True, nullable=True)
    period_start: Mapped[date] = mapped_column(Date, index=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True)

    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    discount_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    tax_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    total: Mapped[float] = mapped_column(Numeric(12, 2), default=0, index=True)
    amount_paid: Mapped[float] = mapped_column(Numeric(12, 2), default=0)

    subscription: Mapped[Subscription] = relationship(back_populates="invoices")
    customer: Mapped[User] = relationship()
    lines: Mapped[list[InvoiceLine]] = relationship(
        back_populates="invoice", cascade="all, delete-orphan"
    )
    payments: Mapped[list[Payment]] = relationship(back_populates="invoice")


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"), index=True)
    description: Mapped[str] = mapped_column(String(255), default="")
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    tax_rate: Mapped[float] = mapped_column(Float, default=0)
    line_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)

    invoice: Mapped[Invoice] = relationship(back_populates="lines")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"), index=True)
    method: Mapped[str] = mapped_column(String(100), default="bank_transfer")
    amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    paid_on: Mapped[date] = mapped_column(Date, index=True, default=date.today)
    note: Mapped[str] = mapped_column(Text, default="")

    invoice: Mapped[Invoice] = relationship(back_populates="payments")
