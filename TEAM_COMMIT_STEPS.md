# Team Commit Steps — honest multi-author history

The repo currently reads as a solo project because all commits are under one account.
The right fix is simple: **each teammate pushes their own real work from their own GitHub
account.** Do not fake authorship, backdate commits, or commit as someone else — reviewers
check that commit emails match GitHub profiles, and a fabricated graph is worse than an
honest uneven one.

Everything lives on a single branch: `main`.

> **Evaluator note:** the repo already has a collaborator `eapa-odoo` with push access —
> confirm that is your assigned Odoo evaluator's handle. If so, the "add evaluator" milestone
> is done; if not, add the correct evaluator under repo → Settings → Collaborators.

---

## The #1 thing that goes wrong: the email

If `git config user.email` is not an email **verified on your GitHub account**, your commit
still lands but shows as an *unknown* author and does NOT link to your profile — so the graph
looks solo even after you push. Set it correctly first:

```bash
git config user.email      # check what it currently is
# fix it to a GitHub-verified email (GitHub → Settings → Emails):
git config user.email "you@your-verified-email"
git config user.name  "Your Name"
```

After your first push, confirm attribution worked: open the repo's commit list on GitHub and
check your commit shows your avatar/profile, not a plain envelope icon.

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

## Good news: you already have push access

All four teammates are collaborators on the repo with **push** permission, so you can push
to `main` directly — no fork, no pull request needed. Verified handles:

| Member | GitHub handle (verified) | Area / files to own |
| --- | --- | --- |
| icamet | `icametoexploree` | `brightloop-api/frontend/src/App.jsx`, `auth.jsx`, `api.js`, `pages/Login.jsx`, `Subscriptions.jsx`, `Invoices.jsx`, `Portal.jsx` |
| Ansh | `AnshShrivastavdev` | `brightloop-api/db/schema.sql`, `db/seed.js`, `src/domain/*`, `src/services/*`, `src/routes/*` |
| Pramod | `pramodsonihere` | `brightloop-api/test/*`, `src/middleware/auth.js`, `validate.js`, `errors.js`, `rateLimit.js` |
| Vikas (lead) | `vikassharma270907-alt` | `frontend/src/pages/Dashboard.jsx`, `Admin.jsx`, `Payments.jsx`, `components/ui.jsx`, READMEs, docker |

Commit message convention: `feat(...)`, `fix(...)`, `test(...)`, `docs(...)`, `chore(...)`.

## A concrete first commit for each person (so nobody is stuck)

Make a *real* small improvement in your own area, then commit it. Suggestions:

- **icamet (`icametoexploree`)** — add a short JSDoc header to `frontend/src/api.js` explaining the
  request/auth helper, or a loading state to one page. `docs(web): document api client` /
  `feat(web): loading state on invoices page`.
- **Ansh (`AnshShrivastavdev`)** — add a SQL comment block to `db/schema.sql` describing the
  billing-period unique constraint, or an index you can justify. `docs(db): explain unique billing constraint`.
- **Pramod (`pramodsonihere`)** — add one more unit test (e.g. an edge case in `test/rules.test.js`)
  and keep it green. `test(rules): cover <edge case>`.

Each of these is genuine work in your lane — exactly what the graph should show.

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
