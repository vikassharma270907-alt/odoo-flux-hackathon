---
inclusion: fileMatch
fileMatchPattern: '**/{api,routers,routes,controllers,endpoints}/**'
---

# API Design Patterns

Adapted from ECC's `api-design` skill ([affaan-m/ECC](https://github.com/affaan-m/ECC), MIT). Content was rephrased/condensed for compliance with licensing restrictions.

## Resource URLs

- Resources are plural, lowercase, kebab-case nouns: `/api/v1/team-members`. No verbs in paths.
- Use sub-resources for ownership (`/users/:id/orders`) and query params for filtering (`?status=active`).
- Reserve verb-style paths for non-CRUD actions only (`/orders/:id/cancel`, `/auth/login`).

## HTTP methods & status codes

- GET read, POST create/action, PUT full replace, PATCH partial update, DELETE remove.
- Use status codes semantically, not `200` for everything:
  - `201 Created` (with `Location` header) on POST, `204 No Content` on DELETE.
  - `400` malformed, `401` unauthenticated, `403` unauthorized, `404` missing, `409` conflict, `422` semantically invalid, `429` rate-limited.
  - `500` never leaks internal details; `503` includes `Retry-After`.

## Response shape

- Success: `{ "data": {...} }`. Collections add `meta` (pagination) and optional `links`.
- Error: `{ "error": { "code", "message", "details?": [{ field, message, code }] } }`.
- Keep naming consistent across endpoints (pick camelCase or snake_case, don't mix).

## Pagination, filtering, sorting

- Offset pagination (`?page=2&per_page=20`) for dashboards/search; cursor pagination for feeds and large datasets.
- Filtering: `?status=active`, comparison via bracket syntax `?price[gte]=10`, multi-value comma-separated.
- Sorting: `?sort=-created_at,price` (prefix `-` = descending). Sparse fields: `?fields=id,name`.

## Auth, rate limiting, versioning

- Bearer tokens for users, API keys for service-to-service. Check both authentication and resource ownership.
- Return rate-limit headers (`X-RateLimit-*`); on `429` include `Retry-After`.
- Version in the path (`/api/v1/`). Don't version until needed; additive changes don't need a new version, breaking changes do.

## Pre-ship checklist

- [ ] URL naming correct (plural, kebab-case, no verbs)
- [ ] Right method + status code
- [ ] Input validated with a schema (Zod / Pydantic)
- [ ] Standard error format with codes
- [ ] Pagination on list endpoints
- [ ] Auth required (or explicitly public) + ownership check
- [ ] No internal detail leakage in errors
- [ ] OpenAPI/docs updated
