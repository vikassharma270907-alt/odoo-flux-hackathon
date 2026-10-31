---
inclusion: fileMatch
fileMatchPattern: '**/{COMMIT_EDITMSG,CHANGELOG*}'
---

# Commit & Contribution Conventions

Adapted from the ECC `ecc-conventions` skill ([affaan-m/ECC](https://github.com/affaan-m/ECC), MIT). Content was rephrased/condensed for compliance with licensing restrictions.

## Commit messages (Conventional Commits)

- Prefixes: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `merge`, `revert`.
- Imperative mood ("Add feature", not "Added feature").
- Concise first line (~65 chars), optional scope: `feat(rules): add C# language support`.

## Do

- Use the conventional commit format.
- Follow the project's test file naming pattern.
- Keep names consistent (camelCase files/functions, PascalCase classes, SCREAMING_SNAKE_CASE constants).

## Don't

- Don't write vague commit messages.
- Don't skip tests for new features.
- Don't deviate from established patterns without discussion.
