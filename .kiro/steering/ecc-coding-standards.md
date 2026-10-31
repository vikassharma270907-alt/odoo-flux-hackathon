---
inclusion: always
---

# Coding Standards

Adapted from the ECC `coding-standards` skill ([affaan-m/ECC](https://github.com/affaan-m/ECC), MIT). Content was rephrased/condensed for compliance with licensing restrictions.

Baseline conventions that apply across the whole project. Framework-specific rules live in the backend/frontend sections of other steering files.

## Core principles

- **Readability first** — code is read far more than it is written. Prefer clear names and self-documenting code over clever one-liners or heavy commenting.
- **KISS** — pick the simplest solution that works. No premature optimization, no speculative abstraction.
- **DRY** — extract shared logic into functions, components, and utilities instead of copy-pasting.
- **YAGNI** — build what the task needs now, not what it might need later.

## Naming

- Variables and functions: descriptive, intent-revealing (`marketSearchQuery`, `isUserAuthenticated`), not `q`, `flag`, `x`.
- Functions follow a verb-noun pattern (`fetchMarketData`, `calculateSimilarity`, `isValidEmail`).
- Files: `PascalCase` for components, `camelCase` for utilities and hooks (`useAuth.ts`), `*.types.ts` for type modules.
- Constants: `SCREAMING_SNAKE_CASE`. Replace magic numbers with named constants.

## Immutability (critical)

- Never mutate objects or arrays in place. Use spread (`{ ...user, name }`, `[...items, newItem]`) instead of assigning fields or calling `push`.
- When sorting, copy first: `[...items].sort(...)` since `Array.prototype.sort` mutates.

## Type safety

- Use explicit types and interfaces. Avoid `any`. Model finite states as unions (`'active' | 'resolved' | 'closed'`).

## Error handling

- Wrap risky async work in `try/catch`, check response status, log the real error, and throw a user-friendly message.
- Validate external input with a schema (e.g. Zod) before using it.

## Async

- Run independent async work in parallel with `Promise.all` rather than awaiting sequentially.

## API design (when applicable)

- Follow REST conventions (`GET /resource`, `POST /resource`, `PATCH /resource/:id`, etc.) and use query params for filtering/pagination.
- Return a consistent response shape: `{ success, data?, error?, meta? }`.

## Code smells to avoid

- Functions longer than ~50 lines — split them.
- Deep nesting — prefer early returns / guard clauses.
- Magic numbers — name them.

## Comments

- Explain *why*, not *what*. Add JSDoc for public APIs (params, returns, throws, example).

## Testing

- Follow the Arrange-Act-Assert pattern. Use descriptive test names that state the behavior and condition.
