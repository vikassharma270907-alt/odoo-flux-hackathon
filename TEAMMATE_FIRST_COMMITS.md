# Teammate First Commits — paste-and-push guide

Goal: make the commit graph show **all four authors** (right now it shows only one).
Each person does this **on their own laptop, logged into their own GitHub account.**

> ⚠️ Do NOT let one person run all of these. The whole point is that each commit is
> authored by a different GitHub account. If Vikas runs them, the graph stays solo.

---

## Step 0 — one-time setup (each teammate)

```bash
git clone https://github.com/vikassharma270907-alt/odoo-flux-hackathon.git
cd odoo-flux-hackathon
git config user.name  "Your Real Name"
git config user.email "YOUR-github-verified-email@example.com"
```

The email **must** be verified on your GitHub account (GitHub → Settings → Emails),
or your commit shows as an unknown author (gray envelope) and the graph still looks solo.

---

## icamet — `icametoexploree` (Frontend)

**File:** `brightloop-api/frontend/src/api.js`
**Edit:** add this JSDoc block immediately ABOVE the line `export async function api(path, ...`:

```js
/**
 * Core fetch wrapper for the Brightloop API.
 * - Attaches the JWT from localStorage as a Bearer token on every request.
 * - On a 401 outside /auth, fires 'bl-logout' so the app clears the session.
 * - Caches successful GETs in localStorage and serves the cached copy when the
 *   network is down, emitting 'bl-offline' so the offline banner can appear.
 * @param {string} path API path under /api, e.g. '/subscriptions'
 * @param {{ method?: string, body?: object }} [opts]
 * @returns {Promise<any>} parsed JSON response
 */
```

```bash
git pull --rebase origin main
# make the edit above
npm --prefix brightloop-api test
git add brightloop-api/frontend/src/api.js
git commit -m "docs(web): document the api() request/auth/offline helper"
git pull --rebase origin main
git push origin main
```

---

## Ansh — `AnshShrivastavdev` (Backend / DB)

**File:** `brightloop-api/db/schema.sql`
**Edit:** find the line `CONSTRAINT invoices_period_uq UNIQUE (subscription_id, period_start),`
and add this comment on the lines ABOVE it:

```sql
  -- Idempotent billing: exactly one invoice per subscription per billing period.
  -- Combined with the row lock in billSubscription(), a repeated Run Billing creates
  -- zero duplicates because the ON CONFLICT path simply skips the already-billed period.
```

```bash
git pull --rebase origin main
# make the edit above
npm --prefix brightloop-api test
git add brightloop-api/db/schema.sql
git commit -m "docs(db): explain the idempotent-billing unique constraint"
git pull --rebase origin main
git push origin main
```

---

## Pramod — `pramodsonihere` (Tests / Middleware)

**File:** `brightloop-api/test/rules.test.js`
**Edit:** add this new test right after the existing `test('password rules', ...)` block:

```js
test('password rejects empty, whitespace-only and non-string inputs', () => {
  assert.ok(validatePassword('').length > 0);          // empty
  assert.ok(validatePassword('        ').length > 0);  // only spaces: no upper/lower/special
  assert.ok(validatePassword(undefined).length > 0);   // non-string is guarded
});
```

```bash
git pull --rebase origin main
# make the edit above
npm --prefix brightloop-api test          # should show one MORE passing test
git add brightloop-api/test/rules.test.js
git commit -m "test(rules): cover empty/whitespace/undefined password inputs"
git pull --rebase origin main
git push origin main
```

---

## Vikas — `vikassharma270907-alt` (lead, already represented)

You already have the bulk of commits. Your job now is to make sure the other three
actually push from their own accounts. Optional extra in your lane: tweak a KPI label
or spacing in `frontend/src/pages/Dashboard.jsx`.

---

## Verify it worked (anyone, anytime)

```bash
git shortlog -sne
```

You want **four distinct authors**. Then open the repo's commit list on GitHub and
confirm each person's commits show their **avatar**, not a gray envelope. If you see an
envelope, that person's `git config user.email` is not GitHub-verified — fix it and recommit.

## Keep contributing through the day

Small and often beats one big dump. 5–10 real commits each across the day, each person
staying mostly in their own files (see the ownership table in `TEAM_COMMIT_STEPS.md`).
