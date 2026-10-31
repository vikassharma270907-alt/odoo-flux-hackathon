# YouTube publish kit — Brightloop demo

Paste these straight into YouTube's upload form.

---

## Title (pick one, ≤100 chars)
- `Brightloop — Subscription Management System | Odoo x FLUX Hackathon '26 Demo`
- `Brightloop: Recurring Billing, Discounts & Finance Dashboard (Node + PostgreSQL + React)`

## Description
```
Brightloop runs a subscription business end to end — products & plans, quotation to
subscription, automatic recurring invoicing, discounts, payments and a finance dashboard —
on a custom Node + PostgreSQL backend with a React front end. No static data, no
backend-as-a-service: every form, status change and chart reads from or writes to PostgreSQL.

Built for the Odoo x FLUX Lucknow Hackathon '26.

🔴 Live demo: https://brightloop-do6a.onrender.com
   Admin login: admin@brightloop.test / Admin@12345
   (Free tier sleeps when idle; first request may take ~30s to wake.)

Highlights
• Idempotent recurring billing — nothing is billed twice, guaranteed by the database
• Automatic discounts & tax applied on the next invoice
• Enforced subscription & invoice state machines (illegal moves return 409)
• Role-based access: admin / staff / customer
• Finance dashboard over 5,000 subscriptions, lists in tens of milliseconds
• 47 passing tests; deployed live on Render + managed PostgreSQL

Stack: Node 20 · Express 4 · PostgreSQL 16 · Zod · JWT · React 18 · Vite · Tailwind · Recharts

Chapters
0:00 Intro — what Brightloop is
0:26 The problem subscriptions pose
0:58 Architecture (React → Express → PostgreSQL)
1:32 Admin: catalogue, variants & discounts
2:14 Subscription lifecycle state machine
2:54 Run Billing — idempotency (the signature moment)
3:40 Payments → invoice flips to Paid
4:14 Validation & role-based access
4:54 Finance dashboard at scale
5:38 Live app walkthrough
6:34 Verification — tests, speed, live deploy
7:08 Close

#Odoo #FLUXHackathon #PostgreSQL #NodeJS #React #SaaS #SubscriptionBilling
```
> Note: adjust the chapter timestamps if your recording's pacing shifts. YouTube only
> renders chapters if the first one is `0:00` and there are at least three, each ≥10s apart.

## Tags (copy the whole line into the Tags box)
```
brightloop, subscription management, recurring billing, odoo hackathon, flux lucknow, nodejs, express, postgresql, react, vite, tailwind, saas, invoicing, finance dashboard, jwt, zod, hackathon demo, full stack
```

## Visibility
- Set to **Unlisted** (or Public) so "anyone with the link can view".
- **Verify in an incognito window** before submitting the link anywhere.

## Thumbnail idea
- A frame from the title scene (the purple/teal "B" logo + "Run a subscription business, end to end").
- Or the Run Billing scene showing "429" and "0" side by side.

---

## Upload steps
1. Record your MP4 (`record-with-voice.ps1`) → `brightloop-demo.mp4`.
2. Go to youtube.com → **Create → Upload video** → select `brightloop-demo.mp4`.
3. Paste the Title and Description above; add the Tags under "Show more".
4. Set "No, it's not made for kids", choose **Unlisted**, Save.
5. Copy the share link, open it in an incognito window to confirm it plays.
6. Paste the link into the hackathon portal ("Submit Video Solution").
