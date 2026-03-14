/conductor

## Just-In-Time Autonomous Execution Protocol

### Step 1 — Load Context (REQUIRED before any other action)

Read the following files in order. Do not skip any.

1. `conductor/current_directive.md` — **This is your north star. You MUST NOT plan or implement anything that does not serve this directive.**
2. `conductor/tech-debt.md` — Understand existing debt to avoid re-introducing known problems.
3. `conductor/lessons-learned.md` — Avoid repeating past mistakes.
4. `conductor/tracks.md` — Check for any `[~] In Progress` track.

---

### Step 2 — Decide: Finish or Plan ONE Track

**If an `[~] In Progress` track exists:**
- Go directly to Step 3. Finish that track. Do not plan a new one.

**If NO in-progress track exists:**
- Plan exactly **ONE** new track that directly serves `current_directive.md`.
- Do not plan multiple tracks. Do not plan work outside the directive.
- Create the track folder at `conductor/tracks/<track_id>/` with:
  - `metadata.json` — id, title, type (`feature|bug|chore`), status (`in_progress`), created date
  - `spec.md` — problem statement, acceptance criteria, subsystem scope
  - `plan.md` — phased task list with `[ ]` checkboxes; each phase ends with a test-run checkpoint
- Add the track to `conductor/tracks.md` with status `[~] In Progress`.
- **CRITICAL:** The first track of any calendar day MUST be a `chore` type focused on refactor/cleanup of the previous day's work. Check today's date before planning.

---

### Step 3 — Implement the Track

Follow the standard TDD cycle for every task in `plan.md`:

1. Mark the task `[~]` in `plan.md`.
2. **Red:** Write a failing test that defines the expected behavior. Run it. Confirm it fails.
3. **Green:** Write the minimum code to make the test pass. Run tests. Confirm they pass.
4. **Refactor:** Clean up without changing behavior. Rerun tests.
5. Mark the task `[x]` in `plan.md` with the short commit SHA appended.
6. Commit: `git commit -m "<type>(<scope>): <description>" --no-verify` is **NOT** allowed — run hooks. Use `git commit -m "..."` normally. Attach a `git notes add` summary to the commit.

At the end of each phase, run the full test suite:
```bash
CI=true bun run test --run 2>&1 | tail -40
```
Fix any failures you introduced (maximum 2 attempts; if still failing, stop and report).

---

### Step 4 — Verify

After all tasks in `plan.md` are `[x]`:

1. Run the full automated test suite:
   ```bash
   CI=true bun run test --run 2>&1 | tail -60
   ```
2. Run the production build:
   ```bash
   cd app && npm run build 2>&1 | tail -20
   ```
3. If either step fails due to **pre-existing** issues documented in memory or lessons-learned, note it and continue. If the failure is **new** (introduced by this track), fix it before proceeding.

4. **Do Not** wait for manual verification. Prioritize test coverage and deep testing to surface issues. 
---

### Step 5 — Finalize & Archive

Execute these steps in order. Do not skip any.

1. **Update memory files** (each must stay ≤ 50 lines):
   - Append relevant new entries to `conductor/tech-debt.md`. Summarize or remove resolved entries to stay under the limit.
   - Append relevant new entries to `conductor/lessons-learned.md`. Summarize or remove outdated entries to stay under the limit.

2. **Update track metadata:**
   - Edit `conductor/tracks/<track_id>/metadata.json`: set `"status": "done"` and add `"completed": "<date>"`.

3. **Archive the track:**
   ```bash
   mv conductor/tracks/<track_id> conductor/archive/<track_id>
   ```

4. **Remove from tracks.md:**
   - Edit `conductor/tracks.md`: remove the entry for `<track_id>` (or change its status marker to `[x] Done` and move it to the archive section, consistent with the file's existing format).

5. **Commit the archive:**
   ```bash
   git add conductor/archive/<track_id> conductor/tracks.md conductor/tech-debt.md conductor/lessons-learned.md
   git commit -m "chore: archive <track_id> track; update docs and lessons"
   ```

6. **Push to remote:**
   ```bash
   git push origin main
   ```

---

### CRITICAL REMINDERS

- **All shell commands MUST use non-interactive flags.** This run is entirely unattended. Never use commands that require keyboard input (e.g., `git rebase -i`, editors, `npm init` without `--yes`).
- **One track at a time.** Never plan a second track until the first is fully archived.
- **Directive lock.** If a task idea does not serve `current_directive.md`, discard it.
- **Pre-existing failures.** Do not try to fix test failures that are documented as pre-existing in `MEMORY.md` or `lessons-learned.md`. Note them and move on.
