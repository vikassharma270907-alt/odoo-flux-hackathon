# Brightloop — Narration Script (timed to the animated deck)

Read this aloud while `brightloop-demo.html` auto-plays. The deck runs ~7:30 of animation (12 scenes,
including a live-app walkthrough). With your natural pacing and small pauses this lands comfortably in the
**5–8 minute** window.

**How to record**
1. Open `brightloop-demo.html` in a browser, press **F** for fullscreen, **R** to reset to the start.
2. Start your screen recorder (OBS / Loom / Windows **Win+Alt+R** / Mac **Shift+Cmd+5**) at 1080p.
3. Press **space** to play and begin narrating. Each scene auto-advances; the timer in the HUD tracks total time.
4. If you fall behind, press **space** to pause, finish the sentence, then **space** to resume.
5. Optional: splice in 20–30s of the *real* live app (dashboard + the "Run Billing twice" moment) after scene 8 for extra credit — Odoo likes seeing the product itself.

Timecodes below are cumulative and match each scene's on-screen duration.

---

### Scene 1 — Title · (0:00 – 0:26)
> Hi, this is Brightloop — a subscription management system built for the Odoo and FLUX Lucknow hackathon.
> It runs a subscription business end to end: products and plans, quotation to subscription, automatic
> recurring invoicing, discounts, payments, and a finance dashboard. It's a custom Node and PostgreSQL
> backend with a React front end — no static data, no backend-as-a-service. Everything you'll see is read
> from or written to a real database.

### Scene 2 — The problem · (0:26 – 0:58)
> Subscriptions look simple and aren't. You have to bill every customer, every period — never twice, never
> skipped. You have to apply the right discount and the right tax at the right moment. Every subscription
> has to move through a strict lifecycle, and your finance numbers have to stay honest in real time.
> Brightloop solves all of that on a real relational database, with three things at its core: idempotent
> recurring billing, automatic discounts and tax, and proper role-based access.

### Scene 3 — Architecture · (0:58 – 1:32)
> Architecturally it's a clean three-tier app. The React single-page app calls the API with a JWT in the
> header. The Express API runs every request through the same pipeline — authenticate, check the role,
> validate the body with Zod, then a thin route hands off to a transactional service, which calls pure
> domain rules. Those domain rules and the invoice maths are unit-tested with no database at all. And
> PostgreSQL does the heavy lifting: parameterised SQL everywhere, row locks where it matters, and SQL
> views that feed the dashboard. Business logic never leaks into the routes.

### Scene 4 — Admin · catalogue · (1:32 – 2:14)
> Let's log in as admin and set up the catalogue. Products can carry variants — here a "Brand equals Odoo"
> variant adds five hundred and sixty rupees to the price, so the final price becomes two thousand five
> hundred sixty. Plans set the billing cadence — daily, weekly, monthly, yearly — along with per-plan flags
> like auto-close and pause that decide what's legal later. And I've armed a discount: ten percent off for
> five or more seats. I don't apply it by hand — it attaches itself to the next invoice automatically, and
> stops the moment it expires or runs out.

### Scene 5 — Lifecycle · (2:14 – 2:54)
> Now a subscription. I create it from a quotation template, so the plan and the line items come in
> automatically with a live price preview, then I pick a customer. Watch the status move: Draft, Quotation,
> Confirmed, Active. The important part is that the buttons only ever offer the *legal* next state. This is
> a real state machine enforced on the server — if you try an illegal transition, the API returns a 409. The
> UI isn't just hiding buttons; the database-backed rules won't allow it.

### Scene 6 — Run Billing · (2:54 – 3:40)
> This is the signature moment. I hit Run Billing. The system finds every active subscription that's due and
> creates one invoice each — four hundred twenty-nine invoices — with the discount and the tax already
> applied. Now watch what happens when I run it *again*. Zero invoices created. Four hundred twenty-nine
> periods skipped. Nothing is billed twice, ever. And that guarantee isn't in the app code — it's in the
> database: a unique constraint on subscription and period, plus "insert on conflict do nothing", backed by
> a per-subscription row lock. Run it ten times, you still get exactly one invoice per period. Missed periods
> get caught up on the next run.

### Scene 7 — Payments · (3:40 – 4:14)
> Payments close the loop. I open an invoice and record a part payment — fourteen hundred rupees against a
> balance of twenty-eight sixteen. The invoice stays Confirmed with a balance showing. Then I record the
> rest, and the invoice flips to Paid on its own. Paid is never a status you can just set — it's only
> reachable by recording real payments that cover the total. And if you try to overpay, the API rejects it
> with a 409.

### Scene 8 — Validation & RBAC · (4:14 – 4:54)
> Access control is strict and it's three-tiered. Admin owns the catalogue and adds staff. Staff do the daily
> work — subscriptions, invoices, billing, payments — but can't touch admin setup. Customers only ever see
> their *own* subscriptions and invoices; hit a staff route as a customer and you get a 403. Validation is
> just as strict: try a weak password and you get a clear, field-level error from both the client and the
> server. And when I sign in as the customer, the admin screens simply aren't there — enforced by a
> requireRole check that re-runs on every single request, so deactivating a user cuts them off instantly.

### Scene 9 — Dashboard · (4:54 – 5:38)
> Back as staff, the finance dashboard. KPI cards for active subscriptions, MRR, revenue collected,
> outstanding and overdue. A revenue-by-month chart, an overdue table oldest-first, and CSV export — all
> driven by SQL views, not computed in JavaScript. And this isn't a toy dataset: it's running over roughly
> five thousand seeded subscriptions and twelve thousand invoices. Every heavy list page responds in tens of
> milliseconds — the requirement was under two seconds.

### Scene 10 — Live walkthrough · (5:38 – 6:34)
> Let me show you the running product itself. I sign in as admin at the live URL, and I'm straight into the
> finance dashboard — these are real numbers coming from PostgreSQL. Over to Subscriptions: every status chip
> you see comes from that enforced state machine. Into Invoices, and this is the one-click moment — Run
> Billing for today. Four hundred twenty-nine invoices created in one pass, each with tax and discount already
> applied; run it again and you'd get zero. Finally the customer portal — signed in as a customer, they see
> only their own subscription and their own invoices, nothing else. Same codebase, deployed live on Render
> with a managed PostgreSQL database, behind a single public URL.
>
> *(Optional: pause the deck here with space and splice in 20–30s of the real `brightloop-do6a.onrender.com`,
> especially clicking **Run Billing twice**. Then resume.)*

### Scene 11 — Verification · (6:34 – 7:08)
> None of this is just syntax-checked — it's verified end to end against a live PostgreSQL. Forty-seven tests
> pass: thirty-five unit and access-control tests, twelve database-backed integration tests. Billing
> idempotency is proven — first run four hundred twenty-nine invoices, second run zero. Role scoping holds.
> Lists over five thousand rows come back in twenty to forty milliseconds. And it's deployed live on Render
> with its own managed PostgreSQL, behind one public URL, from the same codebase.

### Scene 12 — Close · (7:08 – 7:34)
> So that's Brightloop: a custom relational backend with real dynamic data, enforced state machines,
> idempotent billing, automatic discounts and tax, role-based access, and a finance dashboard — all verified
> end to end and running live. Thanks for watching. The live demo and admin login are on screen if you'd
> like to try it yourself.

---

## Demo logins (for the live splice)
| Role | Email | Password |
|---|---|---|
| Admin | admin@brightloop.test | Admin@12345 |
| Staff | staff@brightloop.test | Staff@12345 |
| Customer | customer@brightloop.test | Customer@123 |

## Deck controls
- **space** play / pause · **← →** prev / next scene · **R** restart · **F** fullscreen
- The HUD at the bottom shows the current scene and a running total timer.
