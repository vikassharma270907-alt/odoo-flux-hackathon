"""Subscription lifecycle: create (from scratch or template), status transitions."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import get_current_user, require_staff
from app.models import (
    Plan,
    QuotationTemplate,
    Role,
    Subscription,
    SubscriptionLine,
    SubscriptionStatus,
    User,
)
from app.schemas import SubscriptionIn

router = APIRouter(prefix="/api/v1/subscriptions", tags=["subscriptions"])

# Allowed status transitions: Draft -> Quotation -> Confirmed -> Active -> Closed,
# with pause/renew where the plan permits.
_TRANSITIONS: dict[SubscriptionStatus, set[SubscriptionStatus]] = {
    SubscriptionStatus.draft: {SubscriptionStatus.quotation, SubscriptionStatus.confirmed},
    SubscriptionStatus.quotation: {SubscriptionStatus.confirmed, SubscriptionStatus.closed},
    SubscriptionStatus.confirmed: {SubscriptionStatus.active, SubscriptionStatus.closed},
    SubscriptionStatus.active: {
        SubscriptionStatus.paused,
        SubscriptionStatus.closed,
    },
    SubscriptionStatus.paused: {SubscriptionStatus.active, SubscriptionStatus.closed},
    SubscriptionStatus.closed: set(),
}


def _next_number(db: Session) -> str:
    count = db.scalar(select(func.count()).select_from(Subscription)) or 0
    return f"SUB-{count + 1:06d}"


@router.post("", status_code=status.HTTP_201_CREATED)
def create_subscription(
    payload: SubscriptionIn, db: Session = Depends(get_db), _=Depends(require_staff)
):
    plan = db.get(Plan, payload.plan_id)
    if not plan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found")
    if not db.get(User, payload.customer_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Customer not found")

    sub = Subscription(
        number=_next_number(db),
        customer_id=payload.customer_id,
        plan_id=payload.plan_id,
        start_date=payload.start_date,
        expiry_date=payload.expiry_date,
        payment_terms_days=payload.payment_terms_days,
        status=SubscriptionStatus.draft,
    )
    for line in payload.lines:
        sub.lines.append(
            SubscriptionLine(
                product_id=line.product_id,
                variant_id=line.variant_id,
                tax_id=line.tax_id,
                description=line.description,
                quantity=line.quantity,
                unit_price=line.unit_price,
            )
        )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return {"data": {"id": sub.id, "number": sub.number, "status": sub.status.value}}


@router.post("/from-template/{template_id}", status_code=status.HTTP_201_CREATED)
def create_from_template(
    template_id: int,
    customer_id: int,
    start_date: date | None = None,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    template = db.get(QuotationTemplate, template_id)
    if not template:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found")
    if not template.plan_id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Template has no plan")

    sub = Subscription(
        number=_next_number(db),
        customer_id=customer_id,
        plan_id=template.plan_id,
        start_date=start_date,
        status=SubscriptionStatus.quotation,
    )
    for tline in template.lines:
        sub.lines.append(
            SubscriptionLine(product_id=tline.product_id, quantity=tline.quantity)
        )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return {"data": {"id": sub.id, "number": sub.number, "status": sub.status.value}}


@router.post("/{sub_id}/transition")
def transition(
    sub_id: int,
    to: str,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    sub = db.get(Subscription, sub_id)
    if not sub:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subscription not found")
    try:
        target = SubscriptionStatus(to)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown status: {to}")

    if target not in _TRANSITIONS[sub.status]:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot move from {sub.status.value} to {target.value}",
        )

    # Honor per-plan lifecycle flags.
    if target == SubscriptionStatus.paused and not sub.plan.allow_pause:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Plan does not allow pausing")
    if (
        target == SubscriptionStatus.closed
        and sub.status == SubscriptionStatus.active
        and not sub.plan.allow_close_early
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Plan does not allow early closing")

    sub.status = target
    db.commit()
    return {"data": {"id": sub.id, "status": sub.status.value}}


@router.get("")
def list_subscriptions(
    status_filter: str | None = None,
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Customers see only their own subscriptions; staff/admin see all.
    stmt = select(Subscription).options(selectinload(Subscription.plan))
    if user.role == Role.customer:
        stmt = stmt.where(Subscription.customer_id == user.id)
    if status_filter:
        stmt = stmt.where(Subscription.status == SubscriptionStatus(status_filter))

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(Subscription.id.desc()).offset((page - 1) * per_page).limit(per_page)
    subs = db.scalars(stmt).all()

    return {
        "data": [
            {
                "id": s.id,
                "number": s.number,
                "customer_id": s.customer_id,
                "plan": s.plan.name if s.plan else None,
                "status": s.status.value,
                "start_date": s.start_date.isoformat() if s.start_date else None,
                "expiry_date": s.expiry_date.isoformat() if s.expiry_date else None,
            }
            for s in subs
        ],
        "meta": {"total": total, "page": page, "per_page": per_page},
    }
