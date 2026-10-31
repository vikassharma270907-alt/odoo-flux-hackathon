---
inclusion: always
---

# Brightloop Subscription Management System — Domain Rules

The project: one unified platform for Brightloop Software to run plans, subscriptions, and recurring billing — products/plans setup → quotations → subscriptions → automated invoicing → payments → revenue reporting. Replaces spreadsheets and hand-typed invoices.

## Roles (RBAC)

- **admin** — full control. Only the admin can: add staff, create products/plans/taxes/discounts.
- **staff** — internal day-to-day work with limited access (manage customers, subscriptions, invoices, payments). Cannot manage staff or create discount rules.
- **customer** — portal access to see/manage only their own subscriptions and invoices.

## Auth rules

- Email is unique (one account per email).
- Password: more than 8 characters, with at least one uppercase, one lowercase, and one special character.
- Password reset sends a link to the registered email.

## Core entities

- **Product** — name, type, sales price, cost price, notes; supports **variants** (e.g. brand). A variant can add to price (example from brief: Odoo brand adds 560).
- **Plan** — price, billing period (daily / weekly / monthly / yearly), minimum quantity, availability dates. Per-plan flags: auto-close on end, allow close-early, allow pause, allow renew.
- **Quotation template** — reusable plan + product lines; valid for a set number of days.
- **Subscription** — unique number, customer, plan, start date, expiry date, payment terms; lines (product, quantity, unit price, taxes, amount). Status flow: **Draft → Quotation → Confirmed → Active → Closed**.
- **Invoice** — generated from a subscription with customer details, lines, taxes, totals auto-filled. Status flow: **Draft → Confirmed → Paid**. Actions: confirm, cancel, send, print. Idempotent billing — never bill twice or skip.
- **Tax** — admin-defined rules, applied automatically to invoice lines.
- **Discount** — admin-only. Fixed amount or percentage; minimum purchase/quantity; start/end dates; usage limit. Applies to specific products or whole subscriptions; auto-applies to the next invoice; stops when expired or usage exhausted.
- **Payment** — method, amount, date, note; recorded against the correct invoice.

## Reporting (finance lead)

- One place showing: active subscriptions count, revenue collected, amount outstanding/owed, overdue invoices. Filters + summary view.

## Non-functional

- **Performance:** every page must respond in under 2 seconds with thousands of subscriptions. Index foreign keys and status/date columns; paginate list endpoints; avoid N+1 queries; aggregate reports in SQL, not in Python loops.
- **Billing correctness is critical:** invoice generation must be idempotent (a subscription period is billed exactly once).

## Stack

- Backend: **FastAPI** (Python 3.10+), **SQLAlchemy** ORM, **PostgreSQL** (SQLite fallback for quick local demo).
- Auth: JWT, bcrypt-hashed passwords, role-based dependencies.
- Portal/UI: server-rendered templates (Jinja2) for a fast, self-contained demo.
- Tests: pytest.
