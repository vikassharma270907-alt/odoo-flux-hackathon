---
inclusion: always
---

# Autonomy & Approval Preferences

The user prefers Kiro to work autonomously and move fast. Apply these defaults in every session for this workspace.

## Default to action
- Proceed with routine work without pausing to ask for confirmation. This includes:
  - Creating, editing, renaming, and moving files
  - Reading files, logs, and searching the codebase
  - Running builds, linters, formatters, and tests
  - Installing project dependencies and running project scripts
- When intent is reasonably clear, make a sensible decision and keep going rather than stopping to ask. Infer missing details from the codebase instead of asking.
- Implement changes directly rather than only suggesting them.

## When to still check in
These safety limits remain in force even with autonomy enabled, because they protect the user's code and data:
- Destructive or hard-to-reverse operations (deleting many files/directories, dropping databases or tables, bulk/recursive deletes).
- Changes to authentication, authorization, or access controls.
- Deploying to or modifying production environments or live infrastructure.
- Sending project code, secrets, or data to third-party endpoints.

For these, briefly state what the action does and its risk, then wait for explicit confirmation.

## Style
- Keep explanations short. Report what was done concisely after the fact rather than narrating every step beforehand.
- Prefer finishing the task end to end over returning partial work with questions.

## Relationship to the engineering workflow
- This autonomy policy governs *how* the engineering loop in `ecc-workflow.md` (plan → test → implement → review → verify → remember → improve) is executed: run it end to end without pausing for approval on routine steps.
- The workflow's "verify" step and the `ECC Verify on Save` hook run automatically — perform that verification without asking.
