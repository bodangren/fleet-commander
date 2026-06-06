# Plan: Quality-Gate Enforcement & Dead-Code Sweep

## Phase 1: The `verify` Entrypoint
- [x] Task: Write `measure/verify.sh` (or `npm run verify`) that runs, in order, and aggregates pass/fail: aggregate pivot test, convex test suite (the `./`-prefixed file list, since bunfig root=pivot), frontend test, `pivot typecheck`, `frontend check`, `doctor.sh all`. Exit non-zero on any failure; print a per-gate summary. (`95d4cf5` — Red-phase tests; `f575e7e` — Green: verify.sh implemented, 14/14 tests pass.)
- [x] Task: Document the exact convex-test invocation (it is non-obvious: `bun test $(find convex -name '*.test.ts' | sed 's|^|./|')`). (`95d4cf5` — Red-phase tests pin verbatim string; `f575e7e` — Green: documented in verify.sh source and test contract.)
- [~] Task: Run `verify` and record the current baseline (expected red until review_remediation lands; capture the exact failing gate list). (`95d4cf5` — Red-phase tests; `f575e7e` — Green: verify.sh invocable; baseline capture pending full suite run with bun on PATH.)

## Phase 2: Enforcement Hook
- [ ] Task: Add a pre-push git hook (committed under version control, e.g. via a `hooks/` dir + install step) that runs `verify` and blocks on failure.
- [ ] Task: Provide a documented, logged override (`VERIFY_SKIP=1` with a printed warning) for genuine emergencies — not silent.
- [ ] Task: Add a CI snippet (GitHub Actions or equivalent) to `AGENTS.md` / docs that runs `verify` on push.

## Phase 3: Orphan Detection
- [ ] Task: Build an `orphans` report: query `graph.db` for production nodes (non-test, non-fixture, non-generated) whose only inbound `imports`/`calls` edges originate from `*.test.*` files. Output `path:symbol`.
- [ ] Task: Wire the orphans report into `doctor.sh` as Check 5 (allowlist-backed, like the others); negative-test it.
- [ ] Task: Triage the current orphan list into wire / delete decisions; record in tech-debt.

## Phase 4: Dead-Code Sweep
- [ ] Task: Resolve TD-213 (`WorktreeManager`, `DispatchPacer` exported but never instantiated): wire into production or delete with stale tests.
- [ ] Task: Resolve TD-209 (recovery/continuous-mode orchestrator exports dead in production): wire or delete.
- [ ] Task: Confirm `SaveAsTemplateModal` orphan (TD-238) is resolved by project_template_marketplace Phase 5 (cross-check the orphans report is clean for it).
- [ ] Task: For each remaining orphan: wire-or-delete; remove from the orphans allowlist.

## Phase 5: Closeout Rule & Verification
- [ ] Task: Add to `measure/workflow.md` a closeout gate: "a track may be archived only when `verify` passes and the orphans report is clean (or new orphans are allowlisted with a TD id)."
- [ ] Task: Run `verify`; record an all-green result (coordinating with the tracks that own the current red tests).
- [ ] Task: Update `build-graph`; commit and push.
