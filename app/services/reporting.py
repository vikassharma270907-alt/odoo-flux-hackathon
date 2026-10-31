"""Finance reporting. Aggregates are computed in SQL (not Python loops) so the
dashboard stays under the 2-second target with thousands of subscriptions.
"""
from __future__ import annotations

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Invoice, InvoiceStatus, Payment, Subscription, SubscriptionStatus


def finance_summary(db: Session, as_of: date | None = None) -> dict:
    as_of = as_of or date.today()

    active_subscriptions = db.scalar(
        select(func.count())
        .select_from(Subscription)
        .where(Subscription.status == SubscriptionStatus.active)
    ) or 0

    total_subscriptions = db.scalar(select(func.count()).select_from(Subscription)) or 0

    revenue_collected = db.scalar(select(func.coalesce(func.sum(Payment.amount), 0))) or 0

    # Outstanding = confirmed/sent invoices not yet fully paid.
    outstanding = db.scalar(
        select(func.coalesce(func.sum(Invoice.total - Invoice.amount_paid), 0)).where(
            Invoice.status.in_([InvoiceStatus.confirmed])
        )
    ) or 0

    overdue_count = db.scalar(
        select(func.count())
        .select_from(Invoice)
        .where(
            Invoice.status == InvoiceStatus.confirmed,
            Invoice.due_date.is_not(None),
            Invoice.due_date < as_of,
        )
    ) or 0

    overdue_amount = db.scalar(
        select(func.coalesce(func.sum(Invoice.total - Invoice.amount_paid), 0)).where(
            Invoice.status == InvoiceStatus.confirmed,
            Invoice.due_date.is_not(None),
            Invoice.due_date < as_of,
        )
    ) or 0

    return {
        "as_of": as_of.isoformat(),
        "active_subscriptions": int(active_subscriptions),
        "total_subscriptions": int(total_subscriptions),
        "revenue_collected": float(revenue_collected),
        "outstanding": float(outstanding),
        "overdue_invoices": int(overdue_count),
        "overdue_amount": float(overdue_amount),
    }
