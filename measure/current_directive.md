# Current Directive

**Default branch only:** all work happens on `master`. Do not open long-lived feature branches unless the human explicitly requests one for a PR; land on `master` by default.

Primary focus (2026-08-07, post-merge):

1. **`chore/scalpel` is merged into `master`** (fast-forward to `64ed0c0`).  
   Merge criteria satisfied; see `measure/tracks/scalpel_branch_closeout_20260807/closeout.md`.

2. **Keep single-scheduler architecture**  
   Bun AutoRunner is production; Convex is canonical state; Pi harness is the only executor.  
   Do not reintroduce OpenCode, YAML pipeline engine, or A/B/simulation subsystems.

3. **Next work (on master)**  
   - E2E re-baseline (TD-260)  
   - Convex unit green-up or sustained quarantine policy (TD-263)  
   - Tailwind 4 only when visual work is next (TD-242)  
   - Quality visibility UI shipped (TD-261 closed)

Operational notes:

- Prefer `bun run --cwd frontend test` (package script / Vitest). Bare `bun --cwd frontend test` hangs.
- `measure/verify.sh`: convex-test runs but is non-blocking unless `VERIFY_REQUIRE_CONVEX=1`.
- Do not modify `measure/automation-supervisor.py`; deprecated reference, centrally managed.
- Live Pi dispatch needs Convex up + credentials; unit readiness is green with the installed harness model list.
