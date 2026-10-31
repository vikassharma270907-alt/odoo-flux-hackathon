---
inclusion: always
---

# Engineering Workflow

Adapted from the ECC harness ([affaan-m/ECC](https://github.com/affaan-m/ECC), MIT). Content was rephrased/condensed for compliance with licensing restrictions.

ECC's core idea: instead of re-explaining process in every prompt, make a coordinated engineering loop part of how the agent works. The loop is:

**plan → test → implement → review → verify → remember → improve**

## 1. Plan before building

- Understand the request and the existing code before writing anything. Read the relevant files first.
- For multi-file or unfamiliar changes, outline the approach and the files you'll touch before editing.
- Research unknowns rather than guessing (ECC's "research-first" principle).

## 2. Test

- When adding a feature or fixing a bug, write or update tests that capture the expected behavior.
- Prefer defining the test (or the success criteria) before or alongside the implementation.

## 3. Implement

- Make the smallest change that fully satisfies the task. Match existing patterns, libraries, and style.
- Follow the project coding standards (see `ecc-coding-standards.md`).

## 4. Review (fresh eyes)

- Re-read the diff as if reviewing someone else's work. Check for correctness, edge cases, naming, and leftover debug code.

## 5. Verify

- Run the project's build/compile step and the relevant tests after every change. A clean exit is not proof of success — confirm the actual behavior matches the requirement.
- Clean up temporary files created during verification.

## 6. Remember

- Record non-obvious decisions and context so they survive across sessions (keep `README.md` / design notes current).

## 7. Improve

- When a solution works well and is likely to recur, capture it as a reusable pattern or steering note.

## Autonomy

- Run this loop autonomously. Default to action on routine work (reads, edits, builds, tests, linters, dependency installs, project scripts) without pausing for approval — see `autonomy.md` for the full policy and the safety limits that still require a check-in.
- The loop's "verify" step pairs with the `ECC Verify on Save` hook: when a code file is saved, build/tests are checked automatically. Do that verification work without asking.

## Commit conventions (Conventional Commits)

- Use prefixes: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`.
- Imperative mood, concise first line (~65 chars): `feat(search): add semantic market ranking`.
- Only commit when asked; never write vague messages; don't skip tests for new features.
