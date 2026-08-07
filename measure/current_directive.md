# Current Directive

Primary focus (post scalpel closeout, 2026-08-07):

1. **Merge `chore/scalpel`** when merge criteria in  
   `measure/tracks/scalpel_branch_closeout_20260807/closeout.md` are met.  
   Local evidence: pivot 1661/0, frontend 1211/0, typecheck/lint/codegen green.  
   Convex unit tests remain **quarantined** (TD-263) — not a merge blocker.

2. **Keep single-scheduler architecture**  
   Bun AutoRunner is production; Convex is canonical state; Pi harness is the only executor.  
   Do not reintroduce OpenCode, YAML pipeline engine, or A/B/simulation subsystems.

3. **Next product/quality work (after merge)**  
   - Quality workflow **visibility UI** (TD-261) — `quality_workflow_visibility_ui_20260807`  
   - E2E re-baseline (TD-260)  
   - Convex unit green-up or sustained quarantine policy (TD-263)  
   - Tailwind 4 only when visual work is next (TD-242)

Operational notes:

- Prefer `bun run --cwd frontend test` (package script / Vitest). Bare `bun --cwd frontend test` hangs.
- `measure/verify.sh`: convex-test runs but is non-blocking unless `VERIFY_REQUIRE_CONVEX=1`.
- Do not modify `measure/automation-supervisor.py`; deprecated reference, centrally managed.
- Live Pi dispatch needs Convex up + credentials; unit readiness is green with the installed harness model list.
