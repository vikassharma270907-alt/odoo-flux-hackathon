---
inclusion: fileMatch
fileMatchPattern: '**/*.{test,spec}.{ts,tsx,js,jsx,py}'
---

# Testing Patterns

Adapted from ECC's `e2e-testing` skill ([affaan-m/ECC](https://github.com/affaan-m/ECC), MIT). Content was rephrased/condensed for compliance with licensing restrictions.

## General discipline

- Use Arrange-Act-Assert. Name tests after the behavior and condition: `returns empty array when no markets match query`.
- Write a test alongside every bug fix (reproduce first) and every new feature.
- Keep tests deterministic — no reliance on wall-clock timing or external network unless mocked.

## E2E (Playwright) patterns

- Organize by area: `tests/e2e/<feature>/<name>.spec.ts`, shared fixtures in `tests/fixtures/`.
- Use the **Page Object Model**: wrap selectors and actions for a page in a class, so specs read as intent, not CSS.
- Target elements with stable `data-testid` attributes, not brittle text/CSS selectors.

## Avoiding flaky tests

- Prefer auto-waiting locators (`page.locator(...).click()`) over bare `page.click(...)`.
- Never use arbitrary `waitForTimeout`. Wait for a concrete condition: `waitForResponse(...)`, `waitForLoadState('networkidle')`, or `locator.waitFor({ state: 'visible' })`.
- Quarantine known-flaky tests with `test.fixme`/`test.skip` and link an issue; don't let them block CI.
- Diagnose flakiness by repeating: `npx playwright test <file> --repeat-each=10`.

## Config and CI

- Enable retries in CI (`retries: 2`), capture `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`.
- Upload the HTML report and artifacts from CI even on failure.
- Skip destructive/real-money flows on production (`test.skip(process.env.NODE_ENV === 'production', ...)`).
