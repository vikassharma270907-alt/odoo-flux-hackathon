# Brightloop — Animated Demo Video Kit

This folder turns your Brightloop project into a recordable 5–8 minute demo video.

| File | What it is |
|---|---|
| `brightloop-demo.html` | A self-running, animated presentation. 11 scenes, auto-advancing, ~6:30 of animation. No build step, no internet, no dependencies — just open it in any browser. |
| `NARRATION_SCRIPT.md` | A timed voiceover script. Each section matches one scene's on-screen duration. Read it aloud while the deck plays. |

## Make the video in 4 steps

1. **Open** `brightloop-demo.html` in Chrome/Edge. Press **F** for fullscreen, **R** to reset.
2. **Start recording** (OBS, Loom, Windows `Win+Alt+R`, or Mac `Shift+Cmd+5`) at 1080p.
3. **Press space** to play and **read `NARRATION_SCRIPT.md`** along with the scenes.
4. **Stop, trim, upload** (YouTube unlisted / Drive / Loom) with "anyone with the link can view". Verify in an incognito window.

> Tip for extra credit: after the dashboard scene, splice in 20–30 seconds of the *real* live app
> (`https://brightloop-do6a.onrender.com`) — especially clicking **Run Billing twice**. Odoo's rule is
> "show the product." Warm up the live URL a minute before recording (free tier sleeps).

## Deck controls
- **space** — play / pause
- **← / →** — previous / next scene
- **R** — restart from the beginning
- **F** — toggle fullscreen
- The bottom HUD shows the current scene and a running total timer.

## What's in each scene
1. Title — what Brightloop is + the stack
2. The problem subscriptions pose
3. 3-tier architecture (React → Express → PostgreSQL)
4. Admin catalogue (the Odoo +₹560 variant, plans, discount)
5. Subscription lifecycle state machine
6. **Run Billing** — the idempotency signature moment
7. Payments → invoice flips to Paid
8. Validation + role-based access (admin / staff / customer)
9. Finance dashboard at 5,000-subscription scale
10. Verification — 47 tests, idempotency, speed, live deploy
11. Close + live demo credentials

The animation's colors, KPIs, and layout mirror your actual React app (brand purple `#714B67`,
teal `#017E84`, the real dashboard cards and revenue chart).
