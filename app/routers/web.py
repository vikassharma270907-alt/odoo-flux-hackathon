"""Server-rendered dashboard & portal (cookie-session on top of the JWT auth).

These routes render HTML for the demo. They reuse the same services and models
as the JSON API, and authenticate via the access_token cookie.
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import get_current_user_optional
from app.models import (
    Discount,
    DiscountScope,
    DiscountType,
    Invoice,
    InvoiceStatus,
    Payment,
    Product,
    Role,
    Subscription,
    User,
)
from app.security import create_access_token, verify_password
from app.services.billing import generate_invoice_for_subscription, run_billing_cycle
from app.services.reporting import finance_summary

router = APIRouter(tags=["web"])
templates = Jinja2Templates(directory="app/templates")


def _is_active_discount(d: Discount, on_date: date | None = None) -> bool:
    """Template helper: is this discount currently in effect?"""
    on_date = on_date or date.today()
    if not d.active:
        return False
    if d.start_date and on_date < d.start_date:
        return False
    if d.end_date and on_date > d.end_date:
        return False
    if d.usage_limit and d.times_used >= d.usage_limit:
        return False
    return True


templates.env.filters["is_active_discount"] = _is_active_discount


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _redirect(path: str) -> RedirectResponse:
    return RedirectResponse(path, status_code=303)


# --------------------------------------------------------------------------- #
# Auth (cookie session)
# --------------------------------------------------------------------------- #
@router.get("/login", response_class=HTMLResponse)
def login_form(request: Request):
    return templates.TemplateResponse(request, "login.html", {"user": None})


@router.post("/login")
def login_submit(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password) or not user.is_active:
        return templates.TemplateResponse(
            request,
            "login.html",
            {"user": None, "error": "Invalid email or password.", "email": email},
        )
    token = create_access_token(user.email, user.role.value)
    target = "/dashboard" if user.role in (Role.admin, Role.staff) else "/portal"
    resp = _redirect(target)
    resp.set_cookie("access_token", token, httponly=True, samesite="lax")
    return resp


@router.get("/logout")
def logout():
    resp = _redirect("/login")
    resp.delete_cookie("access_token")
    return resp


# --------------------------------------------------------------------------- #
# Dashboard (admin/staff)
# --------------------------------------------------------------------------- #
@router.get("/dashboard", response_class=HTMLResponse)
def dashboard(
    request: Request,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
    message: str | None = None,
):
    if not user:
        return _redirect("/login")
    if user.role not in (Role.admin, Role.staff):
        return _redirect("/portal")

    subs = db.scalars(
        select(Subscription)
        .options(selectinload(Subscription.plan))
        .order_by(Subscription.id.desc())
        .limit(10)
    ).all()
    return templates.TemplateResponse(
        request,
        "dashboard.html",
        {
            "user": user,
            "summary": finance_summary(db),
            "subscriptions": subs,
            "message": message,
        },
    )


@router.post("/ui/billing-run")
def ui_billing_run(
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    if not user or user.role not in (Role.admin, Role.staff):
        return _redirect("/login")
    created = run_billing_cycle(db)
    return _redirect(f"/dashboard?message=Billing+cycle+created+{len(created)}+invoice(s).")


# --------------------------------------------------------------------------- #
# Subscriptions
# --------------------------------------------------------------------------- #
@router.get("/ui/subscriptions", response_class=HTMLResponse)
@router.get("/portal", response_class=HTMLResponse)
def ui_subscriptions(
    request: Request,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
    message: str | None = None,
):
    if not user:
        return _redirect("/login")
    stmt = select(Subscription).options(selectinload(Subscription.plan))
    if user.role == Role.customer:
        stmt = stmt.where(Subscription.customer_id == user.id)
    subs = db.scalars(stmt.order_by(Subscription.id.desc())).all()
    return templates.TemplateResponse(
        request,
        "subscriptions.html",
        {"user": user, "subscriptions": subs, "message": message},
    )


@router.post("/ui/subscriptions/{sub_id}/invoice")
def ui_invoice_subscription(
    sub_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    if not user or user.role not in (Role.admin, Role.staff):
        return _redirect("/login")
    sub = db.scalars(
        select(Subscription)
        .where(Subscription.id == sub_id)
        .options(selectinload(Subscription.lines), selectinload(Subscription.plan))
    ).first()
    if not sub:
        return _redirect("/ui/subscriptions?message=Subscription+not+found.")
    inv = generate_invoice_for_subscription(db, sub)
    msg = f"Invoice+{inv.number}+created." if inv else "Nothing+due+to+invoice."
    return _redirect(f"/ui/subscriptions?message={msg}")


# --------------------------------------------------------------------------- #
# Invoices
# --------------------------------------------------------------------------- #
@router.get("/ui/invoices", response_class=HTMLResponse)
def ui_invoices(
    request: Request,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
    message: str | None = None,
):
    if not user:
        return _redirect("/login")
    stmt = select(Invoice)
    if user.role == Role.customer:
        stmt = stmt.where(Invoice.customer_id == user.id)
    invoices = db.scalars(stmt.order_by(Invoice.id.desc())).all()

    # Annotate overdue for the template.
    today = date.today()
    for i in invoices:
        i.is_overdue = bool(
            i.status == InvoiceStatus.confirmed and i.due_date and i.due_date < today
        )
    return templates.TemplateResponse(
        request,
        "invoices.html",
        {"user": user, "invoices": invoices, "message": message},
    )


@router.post("/ui/invoices/{invoice_id}/confirm")
def ui_confirm_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    if not user or user.role not in (Role.admin, Role.staff):
        return _redirect("/login")
    inv = db.get(Invoice, invoice_id)
    if inv and inv.status == InvoiceStatus.draft:
        inv.status = InvoiceStatus.confirmed
        db.commit()
    return _redirect("/ui/invoices?message=Invoice+confirmed.")


@router.post("/ui/invoices/{invoice_id}/pay")
def ui_pay_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    if not user or user.role not in (Role.admin, Role.staff):
        return _redirect("/login")
    inv = db.get(Invoice, invoice_id)
    if inv and inv.status == InvoiceStatus.confirmed:
        remaining = Decimal(str(inv.total)) - Decimal(str(inv.amount_paid))
        db.add(
            Payment(
                invoice_id=inv.id,
                method="manual",
                amount=float(remaining),
                paid_on=date.today(),
                note="Marked paid from dashboard",
            )
        )
        inv.amount_paid = float(inv.total)
        inv.status = InvoiceStatus.paid
        db.commit()
    return _redirect("/ui/invoices?message=Invoice+marked+paid.")


# --------------------------------------------------------------------------- #
# Discounts (admin only)
# --------------------------------------------------------------------------- #
@router.get("/ui/discounts", response_class=HTMLResponse)
def ui_discounts(
    request: Request,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
    message: str | None = None,
):
    if not user:
        return _redirect("/login")
    if user.role != Role.admin:
        return _redirect("/dashboard")

    discounts = db.scalars(select(Discount).order_by(Discount.id.desc())).all()
    products = db.scalars(select(Product).where(Product.active.is_(True))).all()
    product_names = {p.id: p.name for p in products}
    return templates.TemplateResponse(
        request,
        "discounts.html",
        {
            "user": user,
            "discounts": discounts,
            "products": products,
            "product_names": product_names,
            "message": message,
        },
    )


@router.post("/ui/discounts/create")
def ui_create_discount(
    name: str = Form(...),
    discount_type: str = Form("percentage"),
    value: float = Form(0),
    scope: str = Form("subscription"),
    product_id: str = Form(""),
    min_purchase: float = Form(0),
    min_quantity: int = Form(0),
    usage_limit: int = Form(0),
    start_date: str = Form(""),
    end_date: str = Form(""),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    if not user or user.role != Role.admin:
        return _redirect("/login")

    resolved_product_id = int(product_id) if product_id.strip() else None
    if scope == "product" and resolved_product_id is None:
        return _redirect("/ui/discounts?message=Product+scope+requires+a+product.")

    discount = Discount(
        name=name,
        discount_type=DiscountType(discount_type),
        value=value,
        scope=DiscountScope(scope),
        product_id=resolved_product_id,
        min_purchase=min_purchase,
        min_quantity=min_quantity,
        usage_limit=usage_limit,
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
        active=True,
    )
    db.add(discount)
    db.commit()
    return _redirect(f"/ui/discounts?message=Created+discount+{name.replace(' ', '+')}.")
