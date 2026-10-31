---
inclusion: fileMatch
fileMatchPattern: '**/{api,app,server,backend,services,repositories,crud,models,routers,lib}/**'
---

# Backend Patterns

Adapted from ECC's `backend-patterns` skill ([affaan-m/ECC](https://github.com/affaan-m/ECC), MIT). Content was rephrased/condensed for compliance with licensing restrictions.

## Layering

- **Repository layer** abstracts data access behind an interface (`findAll`, `findById`, `create`, `update`, `delete`). Swap implementations (DB, cache) without touching callers.
- **Service layer** holds business logic and orchestrates repositories. Keep DB queries out of controllers.
- **Middleware** handles cross-cutting concerns (auth, logging, rate limiting) as a composable pipeline wrapping handlers.

## Database

- Select only needed columns, never blanket `SELECT *`.
- Eliminate N+1 queries: collect IDs, batch-fetch in one query, map results back.
- Wrap multi-write operations in a transaction so partial failures roll back.

## Caching

- Use cache-aside: check cache → on miss fetch from DB → populate cache with a TTL.
- Invalidate the cache key on writes to avoid stale reads.

## Error handling

- Use a typed `ApiError(statusCode, message)` and a centralized handler that maps known errors (validation, not-found, conflict) to status codes and hides unexpected errors behind `500`.
- For transient failures, retry with exponential backoff (1s, 2s, 4s), capped.

## Auth & RBAC

- Verify tokens in one place; attach the user to the request. Reject missing/invalid tokens with `401`.
- Define role→permission maps and check permissions with a `requirePermission(...)` wrapper; insufficient permission is `403`.

## Scaling concerns

- Offload slow work (indexing, emails, webhooks) to a background queue instead of blocking the request.
- Rate-limit by IP or user with a sliding window; return `429` when exceeded.
- Use structured JSON logging with a request ID so logs are traceable.
