# Brightloop — Demo Video Script (5–7 minutes)

**Rule from Odoo:** show the **product, not the code**. Reviewers already have repo access.
Don't scroll source files. Use the pre-seeded demo logins — don't waste time typing signup forms.

**Where to demo**
- **Live app:** https://brightloop-do6a.onrender.com (hosted on Render, real PostgreSQL). On the free tier the first request after idle takes ~30s to wake — **open it a minute before recording** so it's warm.
- **Local fallback (recommended for the recording):** `docker compose up --build` in `brightloop-api/` serves the same app on http://localhost:3000 with the full 5,000-subscription seed and no cold-start lag. Use this for a snappier demo, and *mention* the live URL as proof it's deployed.

**Before you hit record**
- Open two browser windows side by side (you'll switch roles live).
- Have the three logins ready: admin / staff / customer (see table at the bottom).
- Set screen recording to 1080p. Keep the mouse calm and deliberate.
- Upload target: YouTube (unlisted) / Drive / Loom with **"anyone with the link can view"** — verify in an incognito window before submitting.

---

## Timeline

### 0:00 – 0:30 · Hook + what it is
- One sentence: "Brightloop runs a subscription business end to end — plans, subscriptions, automatic recurring billing, discounts, payments and a finance dashboard, on a custom Node + PostgreSQL backend."
- Log in as **admin** (use the seeded login, don't type a signup form).

### 0:30 – 1:45 · Admin sets up the catalogue (the Odoo +560 moment)
- Go to **Admin → Products**. Create a product with a **Brand = Odoo, +560** variant. Point out the variant adds ₹560 to the price.
- **Admin → Plans**: show a plan and toggle a flag live (e.g. auto-close / pause) — point out these drive what's legal later.
- **Admin → Discounts**: create a percentage discount with a minimum quantity (e.g. 10% off for 5+ seats). Mention it will apply automatically on the next invoice and stop when it expires or is used up.

### 1:45 – 2:45 · Quote → subscription → active
- **Subscriptions → Create**: start from a quotation template (plan + lines come in automatically). Pick a customer. Point out the live line/price preview.
- Walk the status chips: **Draft → Quotation → Confirmed → Active.** Note that the buttons only show the *legal* next states — the state machine is enforced on the server.

### 2:45 – 3:45 · Billing day (the signature moment)
- **Invoices → Run Billing.** An invoice appears with **discount and tax already applied** automatically.
- Click **Run Billing again.** Show the result banner: **0 invoices created, periods skipped.**
  Say it plainly: *"Nothing is billed twice — the database enforces one invoice per subscription per period."* This is the headline engineering point.

### 3:45 – 4:30 · Payments → Paid
- Open the invoice, **record a part payment**, then the **remaining balance.**
- Watch the invoice flip **Confirmed → Paid** on its own. Mention overpayment is rejected (409).

### 4:30 – 5:15 · Validation + role separation
- Quickly show a **validation failure**: try a weak password on signup, or an illegal action — show the structured, field-level error (client + server validation).
- **Sign out, log in as the customer.** Show the portal: only *their own* subscriptions and invoices, no admin/staff navigation. Reinforce role-based access control.

### 5:15 – 6:00 · Finance dashboard + scale + resilience
- Back as **staff/admin → Dashboard**: KPI cards (active subscriptions, revenue, outstanding, overdue, MRR), the revenue-by-month chart, the overdue table, CSV export. On the local Docker run this is over **5,000 seeded subscriptions** and every page loads in well under 2 seconds.
- Briefly show **/api/docs** (OpenAPI) to prove a real REST API.
- Mention it is **also deployed live** on Render with its own managed PostgreSQL — one public URL, same codebase.
- Optional: toggle network offline to show the **offline banner** serving cached data.

### 6:00 – 6:30 · Close
- One line: custom relational backend, real dynamic data, enforced state machines, idempotent billing, role-based access, and a finance dashboard — all verified end to end (47 passing tests) and deployed live.

---

## Demo logins

| Role | Email | Password |
|---|---|---|
| Admin | `admin@brightloop.test` | `Admin@12345` |
| Staff | `staff@brightloop.test` | `Staff@12345` |
| Customer | `customer@brightloop.test` | `Customer@123` |

## What NOT to do
- Don't scroll through code files.
- Don't type out registration/signup forms — use the seeded logins.
- Don't claim features that aren't wired to the database.
- Don't rush the "Run Billing twice" moment — it's your strongest point.

## Final submission checklist

**Already done ✅**
- [x] App builds and runs via one command (`docker compose up --build`), verified from a cold DB.
- [x] Custom backend + real PostgreSQL, no static JSON / BaaS.
- [x] 47 automated tests passing; all P0 requirements verified end to end.
- [x] README with setup, demo logins, architecture + state diagrams, and the live URL.
- [x] Deployed live on Render: https://brightloop-do6a.onrender.com
- [x] Code pushed to the single `main` branch.

**Still to do before the deadline ⬜**
- [ ] **Confirm with your mentor that the pre-built starter is allowed** (rules check — do this first).
- [ ] **Balanced commits from all four teammates** — each pushes real commits from their own GitHub account to `main` (see `TEAM_COMMIT_STEPS.md`). This is a top scoring criterion.
- [ ] **Add the assigned evaluator/mentor as a collaborator** on the GitHub repo (Settings → Collaborators).
- [ ] Record the 5–7 min product video (use this script). Warm up the live URL first, or demo on local Docker.
- [ ] Upload the video (YouTube unlisted / Drive / Loom) with **"anyone with the link can view"**.
- [ ] **Verify the video link in an incognito window** before submitting.
- [ ] Final push to `main` before the 5:00 PM code freeze.
- [ ] Paste the video link into the portal via **"Submit Video Solution"** before the deadline.
