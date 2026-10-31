"""Admin catalog management: products, variants, plans, taxes, discounts.

Creating catalog entities and discount rules is admin-only per the brief.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin, require_staff
from app.models import (
    BillingPeriod,
    Discount,
    DiscountScope,
    DiscountType,
    Plan,
    Product,
    ProductVariant,
    Tax,
)
from app.schemas import DiscountIn, PlanIn, ProductIn, TaxIn

router = APIRouter(prefix="/api/v1", tags=["catalog"])


# --- Products (admin) ---
@router.post("/products", status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    product = Product(
        name=payload.name,
        product_type=payload.product_type,
        sales_price=payload.sales_price,
        cost_price=payload.cost_price,
        notes=payload.notes,
    )
    for v in payload.variants:
        product.variants.append(ProductVariant(name=v.name, price_extra=v.price_extra))
    db.add(product)
    db.commit()
    db.refresh(product)
    return {"data": {"id": product.id, "name": product.name}}


@router.get("/products")
def list_products(db: Session = Depends(get_db), _=Depends(require_staff)):
    products = db.query(Product).filter(Product.active.is_(True)).all()
    return {
        "data": [
            {
                "id": p.id,
                "name": p.name,
                "type": p.product_type,
                "sales_price": float(p.sales_price),
                "variants": [
                    {"id": v.id, "name": v.name, "price_extra": float(v.price_extra)}
                    for v in p.variants
                ],
            }
            for p in products
        ]
    }


# --- Taxes (admin) ---
@router.post("/taxes", status_code=status.HTTP_201_CREATED)
def create_tax(payload: TaxIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    tax = Tax(name=payload.name, rate_percent=payload.rate_percent)
    db.add(tax)
    db.commit()
    db.refresh(tax)
    return {"data": {"id": tax.id, "name": tax.name, "rate_percent": tax.rate_percent}}


# --- Plans (admin) ---
@router.post("/plans", status_code=status.HTTP_201_CREATED)
def create_plan(payload: PlanIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    plan = Plan(
        name=payload.name,
        product_id=payload.product_id,
        price=payload.price,
        billing_period=BillingPeriod(payload.billing_period),
        minimum_quantity=payload.minimum_quantity,
        available_from=payload.available_from,
        available_to=payload.available_to,
        auto_close_on_end=payload.auto_close_on_end,
        allow_close_early=payload.allow_close_early,
        allow_pause=payload.allow_pause,
        allow_renew=payload.allow_renew,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return {"data": {"id": plan.id, "name": plan.name}}


@router.get("/plans")
def list_plans(db: Session = Depends(get_db), _=Depends(require_staff)):
    plans = db.query(Plan).all()
    return {
        "data": [
            {
                "id": p.id,
                "name": p.name,
                "price": float(p.price),
                "billing_period": p.billing_period.value,
                "minimum_quantity": p.minimum_quantity,
            }
            for p in plans
        ]
    }


# --- Discounts (admin only) ---
@router.post("/discounts", status_code=status.HTTP_201_CREATED)
def create_discount(payload: DiscountIn, db: Session = Depends(get_db), _=Depends(require_admin)):
    if payload.scope == "product" and payload.product_id is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "product_id is required for product-scoped discounts",
        )
    discount = Discount(
        name=payload.name,
        discount_type=DiscountType(payload.discount_type),
        value=payload.value,
        scope=DiscountScope(payload.scope),
        product_id=payload.product_id,
        min_purchase=payload.min_purchase,
        min_quantity=payload.min_quantity,
        start_date=payload.start_date,
        end_date=payload.end_date,
        usage_limit=payload.usage_limit,
    )
    db.add(discount)
    db.commit()
    db.refresh(discount)
    return {"data": {"id": discount.id, "name": discount.name}}
