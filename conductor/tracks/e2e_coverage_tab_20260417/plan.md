# Implementation Plan - e2e Coverage Tab

## Phase 1: Add Convex mock handler and e2e test

### Tasks

- [x] Task: Add mock handler for `coverageRecords:getCoverageHistory` to `helpers/mockApp.ts` — returns array of mock CoverageRecord entries matching the Convex schema shape
- [x] Task: Create `frontend/e2e/coverage.spec.ts` with test: navigate to project, click Coverage tab, assert CoverageChart renders with mock history
- [x] Task: Add test case: Coverage tab shows "No coverage data" when Convex returns empty array
- [x] Task: Run full e2e suite — all 13 tests pass

## Verification

- [x] Run `cd frontend && npx playwright test` — all pass
- [x] Run `npm run check` — all pass
- [x] Commit with git note