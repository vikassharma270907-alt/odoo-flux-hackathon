# 🚀 Brightloop Subscription Management System

Odoo x FLUX Lucknow Hackathon '26 — Problem Statement: **Subscription Management System**.

One unified platform that runs the full life of a subscription business for *Brightloop Software*: products and plans → quotations → subscriptions → automated recurring billing → payments → revenue reporting. It replaces spreadsheets, hand-typed invoices, and manually-built quarterly reports.

---

## ✨ Features (mapped to the brief)

| Scene in the brief | Implemented as |
| :--- | :--- |
| A new customer signs up | `POST /api/v1/auth/signup` — unique email, strong-password policy, JWT issued |
| Password reset | `POST /api/v1/auth/password-reset/request` + `/confirm` (token to registered email) |
| Roles & access | Admin / staff / customer RBAC; only admin adds staff and creates catalog + discounts |
| Launching a new plan | Products with **variants** (e.g. Odoo brand +560), plans with billing period, min qty, availability dates, per-plan lifecycle flags |
| Quote → subscription | Quotation templates (valid N days); subscription number, lines, **Draft → Quotation → Confirmed → Active → Closed** |
| Billing day | `POST /api/v1/billing/run` generates every due invoice; **idempotent** (never bills twice or skips), auto taxes |
| A better price (discounts) | Admin-only fixed/percentage discounts, min purchase/qty, date window, usage limit, product or subscription scope; auto-applied to the next invoice |
| The money comes in | `POST /api/v1/payments` records method/amount/date/note; invoice flips Draft → Confirmed → Paid |
| Finance lead, end of month | `GET /api/v1/reports/summary` — active subs, revenue, outstanding, overdue; SQL aggregates for sub-2s response |

## 🛠️ Tech Stack

- **FastAPI** (Python 3.10+) — REST API + OpenAPI docs + portal page
- **SQLAlchemy 2.0** ORM — indexed for sub-2s queries at scale
- **PostgreSQL** (production) / **SQLite** (zero-setup demo, default)
- **JWT** auth + bcrypt password hashing (stdlib fallbacks included)
- **pytest** for the test suite

## 📁 Structure

```
app/
├── main.py            # FastAPI app, startup/seed, portal route
├── config.py          # env-driven settings (DATABASE_URL, SECRET_KEY)
├── database.py        # engine, session, Base
├── models.py          # ORM models (users, products, plans, subs, invoices…)
├── schemas.py         # Pydantic request/response models
├── security.py        # password policy, hashing, JWT (with fallbacks)
├── deps.py            # auth + RBAC dependencies
├── seed.py            # default admin + demo data
├── routers/           # auth, catalog, subscriptions, billing, reports
├── services/          # billing engine + reporting (SQL aggregates)
└── templates/         # portal landing page
tests/                 # security + API integration tests
```

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- (Optional) PostgreSQL. SQLite is used out of the box.

### Setup
```bash
git clone https://github.com/vikassharma270907-alt/odoo-flux-hackathon.git
cd odoo-flux-hackathon

python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

### Run
```bash
uvicorn app.main:app --reload
```
Then open:
- Landing: http://127.0.0.1:8000/
- **Dashboard / login:** http://127.0.0.1:8000/login
- API explorer (Swagger): http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health

### Web UI (server-rendered)
- **/login** — cookie session sign-in
- **/dashboard** (admin/staff) — finance summary stats, one-click "Run billing cycle", recent subscriptions
- **/ui/subscriptions** — list + generate invoice per subscription
- **/ui/invoices** — list with overdue flags, confirm + mark-paid actions
- **/portal** (customer) — the customer sees only their own subscriptions and invoices

A demo dataset is seeded on first run so the dashboard shows real numbers immediately.

**Logins:**
- Admin — **admin@brightloop.io** / **Admin@1234**
- Staff — **staff@brightloop.io** / **Staff@1234**
- Customers — **customer@acme.com** / **Customer@123**, **finance@globex.com** / **Globex@123**, **ap@initech.com** / **Initech@123**

**Seeded state** (what the finance dashboard shows on first load):
- 3 active subscriptions (4 total; SUB-000001 is confirmed and not yet billed)
- Revenue collected: ₹15,340 (2 paid invoices)
- Outstanding: ₹15,930 (3 confirmed, unpaid invoices)
- Overdue: 2 invoices (₹15,340) past their due date

**Seeded discounts** (admin-created rules):
- *Support 20% off* — active, scoped to the Priority Support add-on. Auto-applies to SUB-000004's next invoice: 500 → 400 net, so the invoice totals **₹472.00** instead of ₹590.
- *Launch ₹100 off (expired)* — demonstrates the "stops when it expires" rule; it will not apply.
- *Volume 10% (starts next month)* — demonstrates a future-dated rule; not yet active.

Click **Run billing cycle** on the dashboard to generate the next due invoices live — the add-on discount applies automatically, and SUB-000001's unrelated invoice stays at ₹3,681.60.

### Use PostgreSQL (optional)
Set an environment variable (or `.env`):
```
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/brightloop
SECRET_KEY=replace-with-a-long-random-string
```

### Run tests
```bash
pytest -q
```

## 🔑 Quick API tour

```bash
# log in as admin
curl -X POST localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@brightloop.io","password":"Admin@1234"}'

# run the billing cycle (needs the Bearer token from login)
curl -X POST localhost:8000/api/v1/billing/run -H "Authorization: Bearer <TOKEN>"

# finance summary
curl localhost:8000/api/v1/reports/summary -H "Authorization: Bearer <TOKEN>"
```

## ⚙️ Design notes

- **Idempotent billing** — a unique `(subscription_id, period_start)` constraint plus a `last_billed_date` cursor guarantee each period is billed exactly once, even if the billing run is triggered repeatedly.
- **Performance** — foreign keys and status/date columns are indexed; list endpoints paginate; reports use SQL `SUM`/`COUNT` aggregates rather than Python loops.
- **Security** — passwords hashed (bcrypt, PBKDF2 fallback), JWT auth, role-based route guards, schema validation on all input, no secrets in source.
- **Dependency resilience** — `security.py` falls back to stdlib hashing/JWT if `passlib`/`jose` are unavailable; **SQLAlchemy is required** (`pip install -r requirements.txt`).

## 📹 Submission
- Repo: `https://github.com/vikassharma270907-alt/odoo-flux-hackathon`
- Video walkthrough: *(add link)*
