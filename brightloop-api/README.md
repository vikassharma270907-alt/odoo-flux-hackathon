# Brightloop Subscription Management System

Plans, subscriptions, recurring billing, payments and revenue reporting on **Node 20 · Express · PostgreSQL 16 · React 18 + Vite + Tailwind**.
Every form, status change and chart reads from or writes to PostgreSQL. There are no static JSON files and no BaaS.

**🔴 Live demo:** <https://brightloop-do6a.onrender.com> — log in as `admin@brightloop.test` / `Admin@12345`.
(Free tier sleeps after ~15 min idle; the first request may take ~30–50s to wake.)

## Admin login (demo)

| Role | Email | Password |
|---|---|---|
| Admin | admin@brightloop.test | Admin@12345 |
| Staff | staff@brightloop.test | Staff@12345 |
| Customer | customer@brightloop.test | Customer@123 |

> Use the Admin account to reach the admin setup screens (products, plans, taxes, discounts, templates, staff).

**Verified end-to-end** against a live seeded database (1,500 customers / 5,000 subscriptions): billing is idempotent
(a second run bills nothing twice), role scoping holds, and every heavy list page responds in **under 60 ms** — well
inside the 2-second target. 35 unit + access-control tests via `npm test`, plus 12 DB-backed API
integration tests (`node --test test/integration.test.js`) — 47 in total, all green.

## Team & roles

Built for the Odoo x FLUX Lucknow Hackathon '26. Four contributors, one `main` branch:

| Member | GitHub | Focus |
| --- | --- | --- |
| Vikas Sharma (lead) | `vikassharma270907-alt` | Design system, finance dashboard, admin screens, docs, release |
| icamet | `icametoexploree` | Frontend architecture, auth + subscription + invoice + portal pages |
| Ansh Shrivastav | `AnshShrivastavdev` | Database schema, domain logic, billing engine, lifecycle services, routes |
| Pramod | `pramodsonihere` | Auth & security hardening, seed script, unit + API integration tests |

## Run it

```bash
docker compose up --build        # Postgres + seed (1,500 customers, 5,000 subscriptions) + API on :3000
# or locally
cp .env.example .env && npm install && npm run db:seed && npm start
npm test
```

API docs: <http://localhost:3000/api/docs>

## Tests

```bash
npm test               # 35 unit + access-control tests: billing, discounts, state machines, password rules, RBAC (no database needed)
npm run test:integration   # real Express app + PostgreSQL: auth, role scoping, is_active revocation,
                           # rate limiting, billing idempotency, payments, discount expiry
npm run test:all       # both suites
```

The integration suite talks to a separate `subscriptions_test` database so it never touches demo data.
Point it elsewhere with `TEST_DATABASE_URL`; it defaults to the local Docker Postgres. One-time setup:

```bash
docker exec brightloop-api-db-1 psql -U postgres -c "CREATE DATABASE subscriptions_test;"
```

## Frontend (`frontend/`)

React 18 + Vite + Tailwind + React Router + Recharts. Docker serves the built app from the API at <http://localhost:3000>.

```bash
cd frontend && npm install && npm run dev      # http://localhost:5173, proxies /api to :3000
```

Screens: sign-in, sign-up (live password checklist), forgot-password and reset-password; role-guarded routes; finance dashboard (KPIs, revenue chart, overdue table, CSV export, 30-second refresh); subscriptions (filters, create from template, lifecycle buttons that show only legal next states, renew); invoices (filters, Run Billing, confirm, cancel, send, print, record payment); payments list; admin setup (products with variants, plans with flag toggles, taxes, discounts, templates, staff); customer portal; offline banner with cached reads.

| Role | Login | Password |
|---|---|---|
| Admin | admin@brightloop.test | Admin@12345 |
| Staff | staff@brightloop.test | Staff@12345 |
| Customer | customer@brightloop.test | Customer@123 |

## Architecture

```mermaid
flowchart LR
  UI[Web app] -->|JWT| API
  subgraph API[Express API]
    A[authenticate] --> B[requireRole] --> C[Zod validate] --> D[routes]
    D --> E[lifecycle / billing services]
    E --> F[pure rules and invoice maths]
  end
  E --> DB[(PostgreSQL)]
  D --> DB
```

## Subscription lifecycle

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Quotation
  Quotation --> Confirmed
  Confirmed --> Active
  Active --> Paused
  Paused --> Active
  Active --> Closed
  Paused --> Closed
```

## Invoice lifecycle

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Confirmed
  Draft --> Cancelled
  Confirmed --> Paid: payments cover the total
  Confirmed --> Cancelled: only if nothing was paid
```

## Billing day

```mermaid
sequenceDiagram
  participant S as Staff
  participant A as POST /invoices/run-billing
  participant DB as PostgreSQL
  S->>A: asOf (optional)
  A->>DB: due active subscriptions
  loop each subscription (own transaction, row lock)
    A->>DB: lines, taxes, live discounts
    A->>DB: INSERT invoice ON CONFLICT (subscription_id, period_start) DO NOTHING
    A->>DB: discount redemptions, used_count + 1, next_invoice_date
  end
  A-->>S: created, skipped, failed
```

## Rules enforced

* **Sign-up:** one account per email (case-insensitive unique index); the password needs more than 8 characters, an uppercase letter, a lowercase letter and a special character.
* **Roles:** only the admin adds staff and creates plans, products, taxes, discounts and templates. Staff run daily work. Customers see only their own subscriptions and invoices, and can pause, resume or close their own subscription.
* **Nothing is billed twice or skipped:** `UNIQUE (subscription_id, period_start)`, plus row locks and catch-up of missed periods.
* **Discounts:** applied automatically on the next invoice, and they stop when they expire or run out.
* **Tax:** calculated after discounts, from admin-defined rules.
* **Invalid input:** returns `400` with field-level errors. Illegal state changes and overpayments return `409`.
* **Speed:** every list is paginated (max 100), filters use indexes, and dashboard figures come from SQL views.

## Endpoints

See `/api/docs`. The main ones:
`POST /auth/signup|login|forgot-password|reset-password`, `POST /users/staff`,
`/products /plans /taxes /discounts /templates`, `/subscriptions` (`/transition`, `/renew`),
`POST /invoices/run-billing`, `/invoices` (`confirm`, `cancel`, `send`, `print`), `/payments`,
`/reports/summary|revenue|overdue|status-breakdown|export.csv`.

## Deploy

`render.yaml` is a one-click [Render](https://render.com) blueprint: a Docker web service plus a
managed PostgreSQL database. Render builds the `Dockerfile`, injects `DATABASE_URL`, seeds the
database once on first boot (`db/seed-if-empty.js` — redeploys keep the data), and serves both the
API and the built SPA from a single public URL. Railway and Fly.io work the same way.

> Not Vercel: this is a long-running Express server with a stateful PostgreSQL database, which
> serverless platforms do not host well. The Docker image (`docker build .`) is the deploy unit.

## Security

* **Immediate revocation:** every authenticated request re-checks `is_active`, so deactivating a user cuts off access at once (a single primary-key lookup, sub-millisecond).
* **Login rate-limiting:** `/auth/login` and `/auth/forgot-password` are throttled per IP+email (10 and 5 attempts per 15 minutes) and return `429` with a `Retry-After` header. In-memory and per-process; a multi-instance deployment would move this to Redis.

## Known limits

* The reset e-mail prints to the server log unless `SMTP_URL` is set.
