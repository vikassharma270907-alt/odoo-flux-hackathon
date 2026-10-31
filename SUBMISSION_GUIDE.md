# Final Submission Guide — the 4 remaining steps

The code is done, tested (47 passing), and deployed live at https://brightloop-do6a.onrender.com.
These four steps are all human/process actions. Do them in this order.

---

## STEP 1 — Confirm the pre-built starter with your mentor  ⏱ 2 min · DO FIRST

If pre-9:00 code isn't allowed, nothing else matters — resolve this before spending time elsewhere.

1. Open the Odoo portal → your team's **Details** page → find the **Mentor** card. (Or your team's **Discord** channel.)
2. Message the mentor, word for word:
   > "We prepared a backend scaffold before the 9:00 AM start. Is pre-start code allowed if we
   > commit it as clearly-labelled commits, or must all code be written after the problem
   > statement is announced?"
3. **If allowed** → continue to Step 2.
4. **If NOT allowed** → stop and tell your team lead; the plan changes (code must be reconstructed as same-day commits). Get the answer in writing on Discord.

---

## STEP 2 — Balanced commits from all four teammates  ⏱ ~5 min each · HIGHEST SCORING IMPACT

Right now `git shortlog -sne` shows **one author**. Judges check that all teammates committed.
Each teammate does this **on their own laptop, logged into their own GitHub** (see
`HOW_TO_COMMIT.md` and `TEAMMATE_FIRST_COMMITS.md` for exact snippets).

**Setup (once, each teammate):**
```bash
git clone https://github.com/vikassharma270907-alt/odoo-flux-hackathon.git
cd odoo-flux-hackathon
git config user.name  "Your Name"
git config user.email "YOUR-github-verified-email"   # must be verified on your GitHub
```

**First real commit (pick your lane):**
- icamet (`icametoexploree`) → JSDoc on `frontend/src/api.js` → `docs(web): document the api client`
- Ansh (`AnshShrivastavdev`) → comment the unique constraint in `db/schema.sql` → `docs(db): explain idempotent-billing constraint`
- Pramod (`pramodsonihere`) → add a password edge-case test in `test/rules.test.js` → `test(rules): cover empty/whitespace passwords`

**Push:**
```bash
git pull --rebase origin main
git add <your file>
git commit -m "your message"
git pull --rebase origin main
git push origin main
```

**Verify:** `git shortlog -sne` → must show **four authors**. Then on GitHub, each person's
commit must show their **avatar**, not a grey envelope (envelope = wrong email, fix & recommit).

Keep going: 5–10 small real commits each across the day.

---

## STEP 3 — Add the evaluator as a collaborator  ⏱ 2 min

1. Portal → team **Details** page → **Mentor/Evaluator** card → copy their exact **GitHub username**.
2. GitHub repo → **Settings** → **Collaborators** → **Add people** → paste username → send invite.
3. Note: a collaborator `eapa-odoo` may already be added — **verify it matches your assigned evaluator's handle.** If it doesn't, remove it and add the correct one.
4. This is your 10:00 AM milestone.

---

## STEP 4 — Record + upload + submit the video  ⏱ ~45 min

Full timed script is in `DEMO_VIDEO_SCRIPT.md`. Record on **local Docker** (http://localhost:3000)
for speed; mention the live Render URL as proof it's deployed.

**Record (5–7 min, 1080p):**
1. Warm up the app; log in as admin; open a 2nd window for the customer role.
2. Beats: admin setup (**Odoo +560**) → subscription Draft→Active → **Run Billing twice**
   (nothing billed twice — your headline) → part + full payment → Paid → weak-password
   validation → customer portal scoping → dashboard + /api/docs → mention live Render URL.
3. Show the **product, not code**.

**Upload:**
4. YouTube (Unlisted) / Drive / Loom → sharing = **"Anyone with the link can view."**
5. **Verify the link in an incognito window** (plays with no login). ← prevents the #1 failure.

**Submit on the portal:**
6. Details page → **Submit Github Repo Link** (if not done): https://github.com/vikassharma270907-alt/odoo-flux-hackathon
7. **Submit Video Solution** → paste link → confirm. ("Update Submission" to change before deadline.)
8. Screenshot the confirmation.

---

## Final checklist before the 5:00 PM freeze
- [ ] Mentor confirmed the starter is allowed (Step 1)
- [ ] `git shortlog -sne` shows four authors (Step 2)
- [ ] Evaluator added as collaborator, handle verified (Step 3)
- [ ] Final `git push origin main` before 5:00 PM
- [ ] Video uploaded, incognito-verified, submitted on portal before 5:30 PM
- [ ] Fresh-clone sanity: `git clone` → `cd brightloop-api` → `docker compose up --build` → app on :3000
