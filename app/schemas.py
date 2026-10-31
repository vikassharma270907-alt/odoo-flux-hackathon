"""Pydantic request/response schemas."""
from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


# --- Auth ---
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class StaffCreateRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str = ""
    role: Literal["staff", "admin"] = "staff"


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


# --- Catalog ---
class VariantIn(BaseModel):
    name: str
    price_extra: float = 0


class ProductIn(BaseModel):
    name: str
    product_type: str = "service"
    sales_price: float = 0
    cost_price: float = 0
    notes: str = ""
    variants: list[VariantIn] = Field(default_factory=list)


class TaxIn(BaseModel):
    name: str
    rate_percent: float = 0


class PlanIn(BaseModel):
    name: str
    product_id: int | None = None
    price: float = 0
    billing_period: Literal["daily", "weekly", "monthly", "yearly"] = "monthly"
    minimum_quantity: int = 1
    available_from: date | None = None
    available_to: date | None = None
    auto_close_on_end: bool = False
    allow_close_early: bool = True
    allow_pause: bool = True
    allow_renew: bool = True


class DiscountIn(BaseModel):
    name: str
    discount_type: Literal["fixed", "percentage"] = "percentage"
    value: float = 0
    scope: Literal["product", "subscription"] = "subscription"
    product_id: int | None = None
    min_purchase: float = 0
    min_quantity: int = 0
    start_date: date | None = None
    end_date: date | None = None
    usage_limit: int = 0


# --- Subscriptions ---
class SubscriptionLineIn(BaseModel):
    product_id: int
    variant_id: int | None = None
    tax_id: int | None = None
    description: str = ""
    quantity: int = 1
    unit_price: float = 0


class SubscriptionIn(BaseModel):
    customer_id: int
    plan_id: int
    start_date: date | None = None
    expiry_date: date | None = None
    payment_terms_days: int = 15
    lines: list[SubscriptionLineIn] = Field(default_factory=list)


# --- Payments ---
class PaymentIn(BaseModel):
    invoice_id: int
    method: str = "bank_transfer"
    amount: float
    paid_on: date | None = None
    note: str = ""
