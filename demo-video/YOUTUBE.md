# Brightloop — YouTube publishing kit

Everything you need to upload. Files to attach in YouTube Studio:
- **Video:** `brightloop-demo.mp4` (1920×1080, 7:48, H.264 + AAC)
- **Thumbnail:** `thumbnail.png` (1280×720, under 2 MB — YouTube's limit)
- **Subtitles:** `brightloop-demo.srt` (English, upload under *Subtitles → Add → Upload file → With timing*)

---

## Title (pick one — keep under ~70 chars so it isn't truncated)

1. Brightloop — Subscription Billing That Never Bills Twice (Node + PostgreSQL)
2. I Built an Idempotent Subscription Billing System — Odoo × FLUX Hackathon
3. Run Billing Twice, Get Zero Duplicates — Brightloop Demo (React + Node + PG)

**Recommended:** option 1.

---

## Description

Brightloop is a full subscription management system built for the Odoo × FLUX Lucknow Hackathon '26 — products and plans, quotation-to-subscription, automatic recurring invoicing, discounts and tax, payments, and a finance dashboard. It runs on a custom Node + Express + PostgreSQL backend with a React (Vite + Tailwind) front end. No static data, no backend-as-a-service — every value is read from or written to a real relational database.

The signature feature: billing is idempotent by design. Run billing and it creates 429 invoices; run it again and it creates zero — guaranteed by a unique constraint and INSERT … ON CONFLICT DO NOTHING in PostgreSQL, not by app-layer checks.

What's inside:
• Idempotent recurring billing (one invoice per subscription per period, every time)
• Automatic discounts + tax applied on the next invoice
• A server-enforced subscription lifecycle state machine (illegal transitions → 409)
• Payments that auto-settle invoices to Paid; overpayment rejected with 409
• Three-tier role-based access: admin, staff, customer (requireRole on every request)
• A finance dashboard over ~5,000 subscriptions / ~12,000 invoices, driven by SQL views
• Verified end to end: 47 passing tests (35 unit + access-control, 12 DB integration)
• Deployed live on Render with managed PostgreSQL

Tech stack: Node 20, Express, PostgreSQL 16, Zod, JWT, React 18, Vite, Tailwind, Recharts.

Live demo: https://brightloop-do6a.onrender.com
Demo login — Admin: admin@brightloop.test / Admin@12345

Built for the Odoo × FLUX Lucknow Hackathon '26.

#SubscriptionBilling #PostgreSQL #NodeJS #React #SaaS #Hackathon #Odoo #WebDevelopment

---

## Chapters (paste directly into the description — first one must be 0:00)

0:00 Intro - what Brightloop is
0:29 Why subscriptions are hard
1:08 Architecture (React -> Express -> PostgreSQL)
1:46 Admin: catalogue, variants & discounts
2:28 Subscription lifecycle state machine
3:08 Run Billing - idempotent invoicing
3:54 Payments & auto settlement
4:28 Validation & role-based access
5:08 Finance dashboard at scale
5:52 Live app walkthrough
6:48 Verification - 47 tests & live deploy
7:22 Wrap up

---

## Tags (copy into YouTube Studio → Tags)

brightloop, subscription management, recurring billing, idempotent billing, postgresql,
node js, express, react, saas, invoicing, finance dashboard, role based access control,
zod validation, jwt auth, odoo hackathon, flux lucknow, full stack, web development,
state machine, rest api

---

## Suggested upload settings
- **Visibility:** Unlisted (for judging) or Public
- **Category:** Science & Technology
- **Language / caption certification:** English; subtitles not made for TV
- **Audience:** Not made for kids
- **License:** Standard YouTube License
- Enable the uploaded `.srt` as the English caption track so viewers get captions and YouTube indexes the transcript.

## Regenerating any asset
- Video:      `python make_audio.py` → `python plan_timing.py` → `python make_audio.py assemble` → `node render.js` → `python finalize.py`
- Subtitles & chapters:  `python make_captions.py`
- Thumbnail:  edit `thumbnail.svg`, then `node make_thumbnail.js`
