---
inclusion: manual
---

# ECC Reference (full catalog)

Source: [affaan-m/ECC](https://github.com/affaan-m/ECC) — MIT licensed. "The agent harness performance optimization system." Content below is a condensed index; it was rephrased for compliance with licensing restrictions.

> This is a `#`-includable reference. Pull it into chat with `#ecc-reference` when you want to adapt another ECC capability into this project.

## What ECC is

ECC is an engineering system + toolbox for AI coding agents (Claude Code, Codex, Cursor, OpenCode, Gemini, Zed, Copilot, and others). It is NOT a Kiro-native package. Its skills/agents ship as Claude/OpenAI-format files (`SKILL.md`, `openai.yaml`), which Kiro does not load directly. That's why the useful parts have been adapted into native `.kiro/steering/` files here.

## Full catalog (upstream counts)

| Included | Count | Purpose |
| --- | --- | --- |
| Agents | 71 | planning, review, build repair, security, architecture, domain work |
| Skills | 314 | TDD, research, security, docs, frontend, data, ML, operations |
| Commands | 98 | legacy slash-command shims |
| Hooks + memory | runtime | enforcement, session summaries, continuous learning |
| Rules | selective | always-loaded standards by language/project |
| AgentShield | included | scans prompts, hooks, MCP config, permissions, secrets, agent files |

## Signature workflow

`plan → test → implement → review → verify → remember → improve`

## What was adapted into this repo

Always on (every interaction):
- `ecc-workflow.md` — the engineering loop + commit conventions
- `ecc-coding-standards.md` — naming, immutability, types, error handling, code smells
- `ecc-security.md` — AgentShield-style secret/input/auth/dependency rules
- `autonomy.md` — approval/autonomy policy: default to action on routine work, with safety check-ins preserved

Context-triggered (load when matching files are in scope):
- `ecc-api-design.md` — REST conventions, status codes, pagination, versioning → `api|routes|controllers|endpoints` dirs
- `ecc-backend-patterns.md` — repository/service layers, DB, caching, RBAC, queues → `api|server|backend|services|repositories|lib` dirs
- `ecc-testing.md` — AAA, Playwright POM, anti-flake patterns → `*.test.*` / `*.spec.*` files
- `ecc-commit-conventions.md` — Conventional Commits → commit/changelog files

Manual (`#`-include on demand):
- `ecc-research.md` — multi-source, cited deep-research workflow (`#ecc-research`)
- `ecc-reference.md` — this catalog index (`#ecc-reference`)

Hooks:
- `.kiro/hooks/ecc-verify-on-save.json` — reminds to run build/tests after editing code (ECC "verify" step)
- `.kiro/hooks/autonomy-session-start.json` — SessionStart reminder that reinforces the `autonomy.md` policy each session

Source skills adapted so far: `coding-standards`, `ecc-conventions`, `deep-research`, `e2e-testing`, `api-design`, `backend-patterns` — the core engineering set. The remaining ~308 upstream skills are niche (branding, content, media, domain-specific); fetch any of them with the recipe below if a specific need arises.

## Adapting more ECC skills

Some ECC skills map cleanly to Kiro steering if you want them later. Examples:

- `api-design`, `backend-patterns`, `frontend-patterns` → stack-specific steering files
- `deep-research`, `documentation-lookup` → research-first guidance
- `e2e-testing`, `eval-harness`, `benchmark-methodology` → testing steering
- `docs-governance`, `context-and-decisions` → documentation/decision records

To add one: fetch its `SKILL.md` from
`https://raw.githubusercontent.com/affaan-m/ECC/main/.agents/skills/<skill-name>/SKILL.md`,
then rewrite the relevant guidance as a `.kiro/steering/*.md` file.

## Official sources only

Per ECC's own warning, install only from verified channels (the GitHub repo, npm `ecc-universal` / `ecc-agentshield`, the `ecc@ecc` plugin, `ecc.tools`). Third-party mirrors may contain malware. A full native install targets Claude Code via `npx ecc-universal setup` and does not wire into Kiro.
