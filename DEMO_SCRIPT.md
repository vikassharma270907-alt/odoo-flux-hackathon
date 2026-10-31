# 🎬 Video Walkthrough Script — Brightloop Subscription Management

Target length: **2–3 minutes**. Record with OBS/Loom in 1080p. Have the app running (`uvicorn app.main:app --reload`) with freshly seeded data (use **Reset demo data** on the dashboard right before recording).

Logins to keep handy:
- Admin: `admin@brightloop.io` / `Admin@1234`
- Customer: `customer@acme.com` / `Customer@123`

---

## 0:00 – 0:20 · The problem

> "Brightloop Software runs its whole business on subscriptions, but today it lives in spreadsheets. Renewals get missed, invoices are typed by hand, and nobody knows the real recurring revenue. We built one platform that runs the full billing lifecycle — products and plans, subscriptions, automated invoicing, payments, and revenue reporting."

Show the landing page (`/`), then click **Open the Dashboard**.

## 0:20 – 0:45 · Accounts, roles, and the finance dashboard

> "There are three roles — admin, staff, and customer — each with its own access. Here's the finance lead's dashboard."

Log in as admin. Point at the stat cards:
> "Active subscriptions, revenue collected, outstanding balance, and overdue invoices — all computed live in SQL, so it stays under two seconds even with thousands of subscriptions."

## 0:45 – 1:10 · Products, plans, and variants

> "The admin sets up products with variants — choosing the Odoo brand adds 560 to the price — and plans with a billing period, minimum quantity, and lifecycle rules like auto-close, pause, and renew."

Open `/docs` briefly (or a catalog view) to show `POST /products` with a variant, or just describe the seeded Brightloop Pro + Odoo-brand variant.

## 1:10 – 1:35 · Subscriptions

Go to **Subscriptions**.
> "Each subscription has a number, a customer, a plan, and lines, and moves through Draft → Quotation → Confirmed → Active → Closed. Sales reps can also start from a quotation template instead of building from scratch."

## 1:35 – 2:05 · Billing day (the core)

Back on the dashboard, click **Run billing cycle**.
> "On billing day, hundreds of subscriptions are due at once. One click generates every due invoice — customer details, lines, and taxes filled in automatically. And it's idempotent: run it again and nothing is billed twice or skipped."

Go to **Invoices**, open one invoice (click its number).
> "Here's a generated invoice, ready to print or save as PDF. Taxes are applied automatically, and the add-on line came in discounted."

## 2:05 – 2:30 · Discounts and payments

Go to **Discounts**.
> "Only the admin creates discount rules — fixed or percentage, with minimums, a date window, and a usage limit. Once active, a discount applies to the next invoice on its own and stops when it expires."

Back on an invoice, click **Mark paid**.
> "Payments are recorded against the right invoice, which flips from Confirmed to Paid. The team can see at a glance what's paid and what's overdue."

## 2:30 – 2:50 · Customer portal & close

Log out, log in as the customer.
> "Customers get a self-service portal showing only their own subscriptions and invoices — no emailing anyone."

Close:
> "That's Brightloop: the digital backbone for a subscription business — plans, billing, payments, and revenue, all in one place. Built with FastAPI, SQLAlchemy, and PostgreSQL."

---

## Recording checklist
- [ ] `uvicorn app.main:app --reload` running, no errors in the terminal
- [ ] Clicked **Reset demo data** so numbers look clean
- [ ] Browser zoom ~110% so text is readable on video
- [ ] Rehearse once; keep it under 3:00
- [ ] Upload (YouTube unlisted / Loom / Drive with open view) and paste the link in the portal before 05:30 PM
