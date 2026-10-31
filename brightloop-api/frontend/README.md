# Brightloop Frontend (React + Vite)

Single-page app for the Brightloop Subscription Management System. It talks to the Express API under `/api` and is served by that same server in production (so there is one public URL and no CORS setup).

## Stack

- **React 18** + **React Router 6**
- **Vite 5** (dev server + build)
- **Tailwind CSS 3** for styling
- **Recharts** for the dashboard revenue chart

## Run

```bash
cd brightloop-api/frontend
npm install
npm run dev        # Vite on http://localhost:5173, proxies /api to the API on :3000
```

Build for production (the API serves the output from `frontend/dist`):

```bash
npm run build
```

## Structure

```
src/
├── main.jsx            # app entry, mounts <App/>
├── App.jsx             # routes + role-based route guards
├── auth.jsx            # auth context (current user, login/logout)
├── api.js              # fetch wrapper, useApi hook, session + offline cache helpers
├── components/
│   └── ui.jsx          # shared UI primitives (buttons, cards, badges, tables)
├── pages/
│   ├── Login.jsx           # sign in
│   ├── ResetPassword.jsx   # password reset via emailed token
│   ├── Dashboard.jsx       # finance KPIs, revenue chart, overdue table (staff/admin)
│   ├── Subscriptions.jsx   # list, create-from-template, lifecycle transitions
│   ├── Invoices.jsx        # list, run billing, confirm/cancel/send/print, record payment
│   ├── Payments.jsx        # payment history (staff/admin)
│   ├── Admin.jsx           # products/variants, plans, taxes, discounts, templates, staff
│   └── Portal.jsx          # customer view: only their own subscriptions + invoices
└── index.css           # Tailwind entry
```

## How data flows

- `api.js` exposes `api(path, opts)` — a thin `fetch` wrapper that attaches the JWT from `localStorage`, parses errors into a typed `ApiError` (with field-level `details`), and emits `bl-logout` on a 401.
- `useApi(path, { poll })` is a small hook for GET endpoints: it loads on mount, refetches when the path changes, and can poll.
- **Offline cache:** successful GET responses are cached in `localStorage`. If the network is unreachable, the last good copy is returned and a `bl-offline` event fires so the UI can show a banner. The cache is cleared on logout so one user never sees another's data.

## Role-based access

`App.jsx` guards routes by the signed-in user's role:
- **admin** — everything, including the Admin setup screens
- **staff** — day-to-day: subscriptions, invoices, payments, dashboard
- **customer** — the Portal only (their own subscriptions and invoices)

## Conventions

- Format money with `inr()` and dates with `today()` from `api.js`.
- Keep pages thin; put shared presentation in `components/ui.jsx`.
- All server calls go through `api()` so auth, error handling, and caching stay consistent.
