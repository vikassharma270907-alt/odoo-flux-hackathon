# How to add your commits to the project

Hi! Follow these steps on **your own computer**, logged into **your own GitHub account**.
It takes about 5 minutes. When you're done, your name shows up as a real contributor on the
project — which is what the hackathon judges look for.

You already have permission to push, so you do **not** need a fork or a pull request.

---

## Before you start — you need

- **Git installed** → check with `git --version`. If missing, get it from https://git-scm.com/downloads
- **A GitHub account** that is a collaborator on the repo (you already are).
- **Node.js** (to run the tests) → check with `node --version`. Get it from https://nodejs.org if missing.

Open a terminal (PowerShell on Windows, Terminal on Mac/Linux) and run the commands below
one at a time.

---

## Step 1 — Download the project (do this once)

```bash
git clone https://github.com/vikassharma270907-alt/odoo-flux-hackathon.git
cd odoo-flux-hackathon
```

> Already have it on your machine? Skip the clone and just run:
> ```bash
> cd odoo-flux-hackathon
> git pull origin main
> ```

---

## Step 2 — Tell Git who you are  ⚠️ MOST IMPORTANT STEP

If you skip this or get the email wrong, your commit will NOT show up under your name.

```bash
git config user.name  "Your Full Name"
git config user.email "your-github-email@example.com"
```

**The email must be one that is verified on YOUR GitHub account.**
Find it at: GitHub → click your photo → **Settings** → **Emails**.

Check what's currently set:
```bash
git config user.name
git config user.email
```

---

## Step 3 — Make a small real change in your area

Pick the row that's you and edit one of those files. Keep it a genuine, useful change.

| You are | Your GitHub | Files you work on | Easy first change |
| --- | --- | --- | --- |
| icamet | `icametoexploree` | `brightloop-api/frontend/src/` (App.jsx, api.js, pages) | Add a comment at the top of `api.js` explaining what it does, or improve a page's wording |
| Ansh | `AnshShrivastavdev` | `brightloop-api/db/`, `src/domain/`, `src/services/`, `src/routes/` | Add a comment block in `db/schema.sql` explaining the billing tables |
| Pramod | `pramodsonihere` | `brightloop-api/test/`, `src/middleware/` | Add one more small test case in `test/rules.test.js` |

> Don't overthink it. A real, small improvement in your own files is exactly right.
> Make 2–4 small changes/commits rather than one big one — it looks more natural.

---

## Step 4 — Check the tests still pass (optional but recommended)

```bash
cd brightloop-api
npm install        # first time only, downloads dependencies
npm test           # should say: pass 35, fail 0
cd ..
```

---

## Step 5 — Save (commit) and upload (push) your change

```bash
git pull --rebase origin main        # get everyone's latest work first

git add .                            # stage your changes
git commit -m "docs: short description of what you changed"

git pull --rebase origin main        # in case someone pushed while you worked
git push origin main                 # upload to GitHub
```

Use a short message that says what you did, e.g.:
- `docs(web): explain the api client`
- `docs(db): comment the billing schema`
- `test(rules): add edge case for discounts`

---

## Step 6 — Confirm your commit shows up under YOUR name

1. Go to the repo on GitHub:
   https://github.com/vikassharma270907-alt/odoo-flux-hackathon/commits/main
2. Find your commit. It should show **your profile picture / username**.
   - ✅ Your avatar = success.
   - ❌ A plain grey envelope icon = your email in Step 2 was wrong. Fix the email and commit again.

---

## If something goes wrong

- **"Permission denied" / "403" when pushing** → you may need to sign in. Git usually opens a
  browser to log in to GitHub the first time. Sign in with your account.
- **"Updates were rejected" / "non-fast-forward"** → someone pushed before you. Just run
  `git pull --rebase origin main` and then `git push origin main` again.
- **Merge conflict** → it means you and a teammate changed the same lines. Ask the team lead
  (Vikas) for a hand, or edit the marked lines, then `git add .` and `git rebase --continue`.
- **Commit shows the wrong name** → fix `git config user.email` (Step 2) to your GitHub-verified
  email and make another commit.

---

## Please do NOT

- Don't commit using someone else's name or email.
- Don't change files far outside your area without telling the team.
- Don't commit `node_modules`, `.env`, or build output (the project already ignores these).

That's it — thanks for contributing! 🎉
