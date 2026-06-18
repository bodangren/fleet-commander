# Baseline Comparison — Compatible Upgrade Batch

_Generated: 2026-06-07_

This artifact compares the pre-upgrade baseline against the post-upgrade
validation for the compatible dependency batch (Phase 3). It is required by
AC-7: "No quality gate regresses relative to the captured pre-upgrade
baseline."

---

## Pre-Upgrade Failures

Pre-upgrade pivot test results (Bun 1.3.14, 2026-06-07):

```
1219 pass, 46 fail, 4 skip
```

Pre-upgrade failure count: **46**.

All 46 failures are RED-phase tests from other active tracks, recorded in
`baseline.md` § `npm test` — Pre-existing Failures.

---

## Post-Upgrade Failures

Post-upgrade pivot test results after the compatible batch was applied:

```
1219 pass, 46 fail, 4 skip
```

Post-upgrade failure count: **46**.

No new failures were introduced by the compatible upgrade batch.

---

## Delta

| Metric | Pre-Upgrade | Post-Upgrade | Delta |
|--------|-------------|--------------|-------|
| Pass   | 1219        | 1219         | 0     |
| Fail   | 46          | 46           | 0     |
| Skip   | 4           | 4            | 0     |

New regressions introduced by the compatible batch: **0 unexplained**.

The 46 pre-existing failures are owned by the **typed-convex-boundary**
track and are not attributable to this track's dependency changes.

---

## Pre-Existing Failures Not Caused By This Track

The following pre-existing failures were present in the Phase 1 baseline
and remain unchanged after the compatible batch. None are caused by the
package dependency upgrades in this track.

### typed-convex-boundary RED-phase tests (46 failures)

| Suite | Failure count | Root cause |
|-------|---------------|------------|
| `routes/analytics.test.ts` — routes | 6 | Routes not yet migrated to typed Convex calls |
| `routes/analytics.test.ts` — typed-path migration | 6 | String-literal Convex fns still present |
| `routes/performance.test.ts` — typed-path migration | 6 | String-literal Convex fns still present |
| `routes/costs.test.ts` — typed-path migration | 5 | String-literal Convex fns still present |
| `routes/typed-convex-boundary.test.ts` — retrospectives.ts | 4 | String-literal Convex fns still present |
| `routes/typed-convex-boundary.test.ts` — performance.ts | 3 | String-literal Convex fns still present |
| `routes/typed-convex-boundary.test.ts` — costs.ts | 3 | String-literal Convex fns still present |
| `routes/typed-convex-boundary.test.ts` — analytics.ts | 3 | String-literal Convex fns still present |
| `routes/typed-convex-boundary.test.ts` — pipelines.ts | 1 | Missing typed import |
| `routes/typed-convex-boundary.test.ts` — retrospective/scheduler.ts | 3 | String-literal Convex fns still present |
| `routes/typed-convex-boundary.test.ts` — inventory sites | 6 | Inventory not yet zeroed |

These failures are intentionally RED until the typed-convex-boundary track's
GREEN implementation lands. They do **not** indicate a regression from
package dependency changes.
