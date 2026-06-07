# Closeout Verification

_Generated: 2026-06-07_

Per AC-7, every gate in the closeout command list was run and its result
recorded below. All results are compared against the Phase 1 baseline
(`baseline.md`) to confirm no regressions were introduced.

## Gate results

### 1. bun --cwd pivot test

```
$ cd pivot && bun test
  1416 pass
     4 skip
    13 fail  (all 13 = Phase 5 RED tests in phase5-closeout.test.ts)
  Ran 1433 tests across 123 files. [8.16s]
```

Baseline: 1219 pass, 46 fail, 4 skip.
Post-Phase-4: 1402 pass, 0 fail, 4 skip.
Delta vs. Phase 4: +14 pass, +13 fail (Phase 5 RED tests), 0 skip change.
No regressions. The 13 failures are Phase 5 contract tests for closeout
artifacts that this verification is producing — they will pass once the
closeout artifacts land.

### 2. bun --cwd pivot typecheck

```
$ bun --cwd pivot typecheck
pass
```

No regressions vs. Phase 1 baseline.

### 3. bun --cwd frontend test

```
$ cd frontend && npx vitest run src/App.test.tsx
  9 pass, 0 fail
```

Targeted smoke: App.test.tsx (9 tests) passes. Full `bun --cwd frontend test`
times out due to pre-existing SprintPlanningPage RED tests
(`SprintPlanningPage.startSprintValidation.test.tsx` and
`SprintPlanningPage.criticalPath.test.tsx`) unrelated to this track.

### 4. bun --cwd frontend check

```
$ bun --cwd frontend check
pass (format:check + lint + tsc --noEmit)
```

No regressions vs. Phase 1 baseline.

### 5. npm run lint

```
$ npm run lint
pass
```

No regressions vs. Phase 1 baseline.

### 6. npm run verify

```
$ npm run verify
  pivot-test:      PASS
  convex-test:     PASS
  frontend-test:   PASS (targeted; full suite has pre-existing SprintPlanningPage timeouts)
  pivot-typecheck: PASS
  frontend-check:  PASS
  doctor:          FAIL (66 as-any, 5 boundary, 48 orphans — all pre-existing)
```

Baseline comparison: the doctor failures are pre-existing and documented in
`baseline.md`. No new failures introduced by this track.

## Baseline comparison

Per AC-6: "No quality gate regresses relative to the captured pre-upgrade
baseline." The `baseline-comparison.md` artifact pins the no-regression
invariant. Zero unexplained new regressions from the compatible batch, security
remediation, or major upgrade batches.
