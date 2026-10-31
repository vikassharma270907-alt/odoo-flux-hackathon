# Deployment Guide — Brightloop Subscription Management System

The app is a long-running **Express API + PostgreSQL** that also serves the built React SPA from the same origin. Deploy it to a platform that runs a persistent server and a managed database.

> **Not Vercel.** Vercel is serverless with no persistent Postgres, so it does not fit this stack. Use **Render** (the blueprint is already in the repo), or Railway / Fly.io.

The deployable app lives in the **`brightloop-api/`** subfolder, and so does the Render blueprint (`brightloop-api/render.yaml`). That subfolder detail matters during setup — see step 3.

---

## Deploy to Render (recommended — blueprint included)

1. **Push the repo to GitHub** (already done — `origin/main`).
2. On [render.com](https://render.com): **New → Blueprint** and pick the `odoo-flux-hackathon` repository.
3. **Set the blueprint / root directory to `brightloop-api`.** The `render.yaml` is inside that subfolder, not the repo root, so Render will not auto-detect it unless you point the blueprint at `brightloop-api/`. This is the single most common setup mistake here.
4. Render reads `render.yaml` and provisions everything automatically:
   - a free **PostgreSQL 16** database (`brightloop-db`)
   - a **Docker web service** built from `brightloop-api/Dockerfile`
   - injects `DATABASE_URL` from the DB, generates a strong `JWT_SECRET`, sets `NODE_ENV=production` and `PORT=3000`
   - start command: `node db/seed-if-empty.js && node src/server.js`
5. Click **Apply / Deploy**. First boot builds the frontend, builds the API image, provisions Postgres, **seeds once**, then starts.
6. Health check: Render polls `/api/health` (returns `{ "ok": true }`). When it is green, the service URL serves both the API (`/api/...`) and the SPA.

### Seeding behaviour
- `seed-if-empty.js` seeds **only when the database is empty**, so redeploys never wipe live data.
- Seed size on the free tier is kept light via `SEED_CUSTOMERS=300` / `SEED_SUBS=800` in `render.yaml`. Raise these for a fuller demo (and use a paid DB plan for the full ~5k dataset).

### Free-tier notes (important for the live demo)
- The **first deploy is slow** (frontend build + Docker build + seed) — allow several minutes.
- Free web services **spin down after inactivity**; the first request after idle takes ~30–50s to wake. **Warm the URL ~1 minute before presenting.**

---

## Run locally (for development / the video demo)

```bash
cd brightloop-api
cp .env.example .env            # defaults point at a local Postgres
npm install
npm run db:seed                 # drops + reseeds the local database
npm start                       # API + SPA on http://localhost:3000  (docs: /api/docs)
```

Frontend dev server with hot reload (optional):
```bash
cd brightloop-api/frontend
npm install
npm run dev                     # Vite on http://localhost:5173, proxies /api to :3000
```

Demo logins (seeded):
- Admin — `admin@brightloop.test` / `Admin@12345`
- Staff — `staff@brightloop.test` / `Staff@12345`
- Customer — `customer@brightloop.test` / `Customer@123`

---

## Tests

```bash
cd brightloop-api
npm test               # unit suite (no database needed)
npm run test:integration   # HTTP + PostgreSQL integration suite (needs a test DB)
npm run test:all           # both, run in separate processes
```

The integration suite expects a `subscriptions_test` database (or set `TEST_DATABASE_URL`). It skips automatically if the DB is unreachable, so `npm test` always runs anywhere.

---

## Environment variables

| Variable | Purpose | Set by |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | Render (from the managed DB) / `.env` locally |
| `JWT_SECRET` | Signs auth tokens — **required in production** | Render generates it / set in `.env` locally |
| `JWT_EXPIRES_IN` | Token lifetime (default `8h`) | optional |
| `PORT` | HTTP port (default `3000`) | Render / optional |
| `NODE_ENV` | `production` enforces `JWT_SECRET` | Render |
| `CORS_ORIGIN` | Allowed origin (default `*`; unused in prod since the SPA is same-origin) | optional |
| `SEED_CUSTOMERS` / `SEED_SUBS` | Demo seed size | `render.yaml` |
