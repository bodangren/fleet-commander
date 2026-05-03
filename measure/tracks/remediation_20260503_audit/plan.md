# Quality Remediation — Implementation Plan

## Phase 1: Fix Fake Analytics Tests (CRITICAL)

- [x] Task: Replace `pivot/src/analytics.test.ts` with real Convex query function tests
  - [x] Write tests for `getCompletionTrends` — verify date bucketing, status counting, edge cases (empty data, single day, across month boundary)
  - [x] Write tests for `getAgentUtilization` — verify agent grouping, date bucketing, status filtering
  - [x] Write tests for `getBottlenecks` — verify sorting by failure rate/duration, empty data, division by zero
  - [x] Write tests for `getQueueDepth` — verify cumulative snapshots, status filtering correctness
  - [x] Write tests for `getHookMetrics` — verify phase filtering, severity classification, date bucketing
  - [x] Write tests for `getSessionMetrics` — verify resumption rate calculation, byDate breakdown, zero-tasks edge case
  - [x] Delete the old mock-based test file
  - [ ] Verify ≥80% coverage on all Convex analytics query functions

## Phase 2: Restore E2E Test Integrity (HIGH)

- [x] Task: Investigate `TRIGGER_RUN` / `RUN_STATUS` text leak
  - [x] Confirmed intentional "tactical ledger" design language — uppercase styling used throughout ProjectViewPage
- [x] Task: Restore proper assertions in `project.spec.ts`
  - [x] Replaced meaningless `expect(source).toBeVisible()` with API call verification (`PATCH /api/../tasks/task-todo-1 { status: "done" }`)
  - [x] Added API call verification for blocked task issue fetch (`GET /api/../issues/task-blocked-1`)
  - [x] Added missing `PATCH /api/../tasks/:taskId` mock handler in `mockApp.ts`
  - [x] Preserved `BLOCKED` assertion (matches KanbanBoard badge)
  - [x] Documented "Failed to load resource" suppression in mockApp.ts
  - [ ] Run full e2e suite: confirm all 23 tests pass with proper assertions

## Phase 3: Add Convex Query Unit Tests (HIGH)

- [x] Task: Create `convex/analytics.test.ts` for `convex/analytics.ts`
  - [x] Extracted pure computation functions into `convex/lib/analytics.ts` (6 functions, 316 lines)
  - [x] Wrote 50 comprehensive unit tests covering date-bucketing edge cases, aggregation correctness, zero-data scenarios, boundary conditions
  - [x] Refactored `convex/analytics.ts` query handlers to delegate to pure functions (thin wrappers)
  - [x] All 50 tests pass (combined with cost/budget tests: 93 pass, 0 fail)

## Phase 4: Fix Cost Backfill Hardcoding (MEDIUM)

- [x] Task: Make `backfillCostRecords` model-aware
  - [x] Added optional `model` arg to `backfillCostRecords` mutation (defaults to `'gpt-4o'`)
  - [x] `backfillCostRecords` now uses caller-provided model for rate lookup and stored model field
  - [ ] Write test for model parameter behavior

## Phase 5: Audit mockApp.ts Error Suppression (MEDIUM)

- [x] Task: Investigate suppressed "Failed to load resource" errors
  - [x] "Failed to load resource" originates from fonts/images/static assets that 404 in mock Playwright environment (mockApp only routes `/api/**`)
  - [x] Added inline comment documenting suppression rationale — harmless noise in mock context, not a production concern

## Phase 6: Clean Up Deferred Items (LOW)

- [x] Task: Verify tech-debt registry completeness
  - [x] Confirmed TD-034 (analytics e2e), TD-035 (perf benchmark), TD-036 (hook markers) accurately document deferred analytics tasks
  - [x] Added TD-037 for `issueState` rendering bug (blocked-task issue detail fetched but never displayed in ProjectViewPage)
  - [x] All deferred items properly tracked

## Phase 7: Final Verification

- [x] Task: Run full test suite
  - [x] `bun test convex/lib/analytics.test.ts, cost.test.ts, budget.test.ts` — 93 pass, 0 fail
  - [x] `bun --cwd pivot test` — 766 pass, 15 fail (all TD-033 pre-existing)
  - [x] `bun --cwd frontend test` — 277 pass, 0 fail
  - [x] Affected modules (analytics lib, cost lib, budget lib) all ≥80% coverage
  - [x] `convex/analytics.ts` refactored — query handlers delegate to pure, tested functions
