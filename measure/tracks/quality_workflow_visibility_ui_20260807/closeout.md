# Closeout: Quality workflow visibility UI

**Closed:** 2026-08-07  
**Status:** completed  
**TD-261:** Resolved

## Delivered

| Surface | Route / location |
| --- | --- |
| Settings profile select + stages | `/settings/quality` → `QualitySettingsPage` + `QualityProfileSection` |
| Timeline quality rows | `TaskTimelinePage` + `QualityStageRow` (via REST timeline when no Convex URL) |
| Ops diagnose / retry | `/ops/quality` → `OpsQualityPage` + `QualityOperationsPanel` |
| Seed helper | `seedScenario().goto()` for e2e navigation |
| Mock APIs | Quality profiles/select/runs/retry + task-42 timeline in `mockApp.ts` |

## Verification

- Unit: quality components + useTaskTimeline + routes green  
- E2E: `npm run test:e2e -- e2e/quality-workflow.spec.ts` → **1 passed** (2026-08-07)

## Notes

- Components largely pre-existed; this track wired routes, mocks, timeline REST fallback, and seed.goto (TD-259 root cause for this spec).
- E2e asserts `data-status` (not invalid `aria-status`).
