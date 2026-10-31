# Contributing — Brightloop Subscription Management System

Short guide for working on the API and keeping the test suite green.

## Setup

```bash
cd brightloop-api
cp .env.example .env     # defaults point at a local Postgres
npm install
npm run db:seed          # drops + reseeds the local database
npm start                # API + SPA on http://localhost:3000  (docs: /api/docs)
```

## Running tests

```bash
npm test                 # pure-unit suite (no database needed) — run this before every commit
npm run test:integration # HTTP + PostgreSQL integration suite (needs a test DB)
npm run test:all         # unit then integration, in separate processes
```

The integration suite expects a `subscriptions_test` database (or set `TEST_DATABASE_URL`). It skips automatically when the DB is unreachable, so `npm test` always runs anywhere.

## Where things live

| Area | Path |
|---|---|
| Pure business rules (dates, password policy, state machines) | `src/domain/rules.js` |
| Invoice pricing maths (discounts, taxes) | `src/domain/invoiceCalc.js` |
| Billing engine (idempotent invoice generation) | `src/services/billing.js` |
| Lifecycle, payments, renewals | `src/services/lifecycle.js` |
| HTTP routes | `src/routes/*.js` |
| Schema | `db/schema.sql` |
| Tests | `test/*.test.js` |

## Conventions

- **Add a test with every behavioural change.** Pure logic goes in `src/domain` and is unit-tested; keep routes thin.
- Keep money as `NUMERIC(12,2)` in the DB and round at each step in JS (`round2`).
- Dates are `YYYY-MM-DD` strings end to end to avoid timezone drift.
- Validate all input with the Zod schemas in `src/schemas.js`; never build SQL by string concatenation.
- Use **conventional commit** messages: `feat:`, `fix:`, `test:`, `docs:`, `chore:`.

## Before you push

1. `npm test` is green.
2. New behaviour has a test.
3. No secrets committed (`.env` is git-ignored; use `.env.example`).
4. Commit from **your own** GitHub account so contributions are attributed correctly.
