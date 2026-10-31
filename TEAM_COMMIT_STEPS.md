# Team Commit Steps — honest multi-author history

The repo currently reads as a solo project because all commits are under one account.
The right fix is simple: **each teammate pushes their own real work from their own GitHub
account.** Do not fake authorship, backdate commits, or commit as someone else — reviewers
check that commit emails match GitHub profiles, and a fabricated graph is worse than an
honest uneven one.

Everything lives on a single branch: `main`.

---

## One-time setup (each teammate, on their own machine)

```bash
git clone https://github.com/vikassharma270907-alt/odoo-flux-hackathon.git
cd odoo-flux-hackathon
```

Make sure your git identity matches your GitHub account, or your commits won't attribute to you:

```bash
git config user.name  "Your Name"
git config user.email "the-email-verified-on-your-github@example.com"
```

> The email MUST be one that is verified on your GitHub account. Check at
> GitHub → Settings → Emails. If it doesn't match, the commit shows as an unknown author.

---

## Each time you contribute

```bash
git pull --rebase origin main        # get everyone else's latest work first
# ... make a real change in your area ...
npm --prefix brightloop-api test     # keep the 35 unit/access tests green (+12 integration via test:integration = 47 total)
git add <only the files you actually changed>
git commit -m "feat(scope): what you did"    # imperative, scoped message
git pull --rebase origin main        # re-sync in case someone pushed meanwhile
git push origin main
```

Commit small and often (5–10 commits each across the day beats one big dump).

---

## Who naturally owns what (from the team roles)

| Member | GitHub | Area / files |
| --- | --- | --- |
| icametexploree | `icametexploree` | `brightloop-api/frontend/src/App.jsx`, `auth.jsx`, `api.js`, `pages/Login.jsx`, `Subscriptions.jsx`, `Invoices.jsx`, `Portal.jsx` |
| Ansh Shrivastav | (set GitHub email) | `brightloop-api/db/schema.sql`, `db/seed.js`, `src/domain/*`, `src/services/*`, `src/routes/*` |
| pramodsonihere | `pramodsonihere` | `brightloop-api/test/*`, `src/middleware/auth.js`, `validate.js`, `errors.js`, `rateLimit.js` |
| Vikas (lead) | `vikassharma270907-alt` | `frontend/src/pages/Dashboard.jsx`, `Admin.jsx`, `Payments.jsx`, `components/ui.jsx`, READMEs, docker |

Commit message convention: `feat(...)`, `fix(...)`, `test(...)`, `docs(...)`, `chore(...)`.

---

## Check the author spread at any time

```bash
git shortlog -sne        # commits per author — aim for all four represented
```

## Before the 17:00 freeze

- [ ] All four teammates have real commits on `main` (`git shortlog -sne` shows four authors).
- [ ] `npm --prefix brightloop-api test` is green.
- [ ] `node_modules`, `.env`, `frontend/dist`, build logs are NOT committed.
- [ ] Assigned Odoo evaluator added: repo → Settings → Collaborators → Invite.
- [ ] Fresh-clone sanity check: `git clone`, `cd brightloop-api`, `docker compose up --build`, app loads on :3000.
