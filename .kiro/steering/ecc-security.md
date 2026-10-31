---
inclusion: always
---

# Security Standards

Adapted from ECC's AgentShield scope ([affaan-m/ECC](https://github.com/affaan-m/ECC), MIT). Content was rephrased/condensed for compliance with licensing restrictions.

AgentShield scans for risks in prompts, hooks, MCP config, permissions, secrets, and agent files. Apply the same awareness while writing code for this project.

## Secrets

- Never hardcode API keys, tokens, passwords, or connection strings. Read them from environment variables or a secrets manager.
- Keep secrets out of source control. `.env` and credential files belong in `.gitignore`.
- Don't echo secret values in logs, output, or commits — reference them by key name.

## Input handling

- Treat all external input (request bodies, query params, file contents, command output, web results) as untrusted.
- Validate and sanitize with a schema before use. Use parameterized queries — never build SQL/commands by string concatenation.

## Auth & access

- Enforce authentication and authorization on every protected endpoint. Don't weaken or remove access controls without explicit discussion.

## Dependencies

- Pin dependency versions. Prefer well-known, actively maintained packages. Flag unusual names that could be typosquats.

## Config & automation

- Review hooks, MCP server config, and tool permissions before trusting them. Be cautious with anything that auto-runs shell commands.
- Don't transmit project code, secrets, or user data to third-party endpoints unless it's an explicit, intended part of the task.
