"""Invoices and payments: generate, transition, record payment, list."""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import get_current_user, require_staff
from app.models import Invoice, InvoiceStatus, Payment, Role, Subscription, User
from app.schemas import PaymentIn
from app.services.billing import generate_invoice_for_subscription, run_billing_cycle

router = APIRouter(prefix="/api/v1", tags=["billing"])


@router.post("/subscriptions/{sub_id}/invoice", status_code=status.HTTP_201_CREATED)
def invoice_subscription(sub_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    sub = db.scalars(
        select(Subscription)
        .where(Subscription.id == sub_id)
        .options(selectinload(Subscription.lines), selectinload(Subscription.plan))
    ).first()
    if not sub:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subscription not found")

    invoice = generate_invoice_for_subscription(db, sub)
    if invoice is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Nothing due to invoice for this period")
    return {"data": {"id": invoice.id, "number": invoice.number, "total": float(invoice.total)}}


@router.post("/billing/run")
def billing_run(db: Session = Depends(get_db), _=Depends(require_staff)):
    """Billing day: generate every due invoice in one pass. Safe to re-run."""
    created = run_billing_cycle(db)
    return {"data": {"invoices_created": len(created), "numbers": [i.number for i in created]}}


@router.post("/invoices/{invoice_id}/{action}")
def invoice_action(
    invoice_id: int, action: str, db: Session = Depends(get_db), _=Depends(require_staff)
):
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invoice not found")

    if action == "confirm":
        if invoice.status != InvoiceStatus.draft:
            raise HTTPException(status.HTTP_409_CONFLICT, "Only draft invoices can be confirmed")
        invoice.status = InvoiceStatus.confirmed
    elif action == "cancel":
        if invoice.status == InvoiceStatus.paid:
            raise HTTPException(status.HTTP_409_CONFLICT, "Paid invoices cannot be cancelled")
        invoice.status = InvoiceStatus.cancelled
    elif action in ("send", "print"):
        # Stub for demo; a real system renders a PDF / emails the customer.
        pass
    else:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown action: {action}")

    db.commit()
    return {"data": {"id": invoice.id, "status": invoice.status.value, "action": action}}


@router.post("/payments", status_code=status.HTTP_201_CREATED)
def record_payment(payload: PaymentIn, db: Session = Depends(get_db), _=Depends(require_staff)):
    invoice = db.get(Invoice, payload.invoice_id)
    if not invoice:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invoice not found")
    if invoice.status == InvoiceStatus.cancelled:
        raise HTTPException(status.HTTP_409_CONFLICT, "Cannot pay a cancelled invoice")

    payment = Payment(
        invoice_id=invoice.id,
        method=payload.method,
        amount=payload.amount,
        paid_on=payload.paid_on or date.today(),
        note=payload.note,
    )
    db.add(payment)

    # Update the invoice's paid amount and flip to Paid when fully covered.
    invoice.amount_paid = float(Decimal(str(invoice.amount_paid)) + Decimal(str(payload.amount)))
    if Decimal(str(invoice.amount_paid)) >= Decimal(str(invoice.total)):
        invoice.status = InvoiceStatus.paid

    db.commit()
    db.refresh(invoice)
    return {
        "data": {
            "invoice_id": invoice.id,
            "amount_paid": float(invoice.amount_paid),
            "status": invoice.status.value,
        }
    }


@router.get("/invoices")
def list_invoices(
    status_filter: str | None = None,
    overdue: bool = False,
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Invoice)
    if user.role == Role.customer:
        stmt = stmt.where(Invoice.customer_id == user.id)
    if status_filter:
        stmt = stmt.where(Invoice.status == InvoiceStatus(status_filter))
    if overdue:
        stmt = stmt.where(
            Invoice.status == InvoiceStatus.confirmed,
            Invoice.due_date.is_not(None),
            Invoice.due_date < date.today(),
        )

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(Invoice.id.desc()).offset((page - 1) * per_page).limit(per_page)
    invoices = db.scalars(stmt).all()

    return {
        "data": [
            {
                "id": i.id,
                "number": i.number,
                "customer_id": i.customer_id,
                "status": i.status.value,
                "total": float(i.total),
                "amount_paid": float(i.amount_paid),
                "due_date": i.due_date.isoformat() if i.due_date else None,
                "is_overdue": bool(
                    i.status == InvoiceStatus.confirmed
                    and i.due_date
                    and i.due_date < date.today()
                ),
            }
            for i in invoices
        ],
        "meta": {"total": total, "page": page, "per_page": per_page},
    }
