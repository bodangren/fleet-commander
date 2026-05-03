# Quality Remediation — Implementation Plan

## Phase 1: Fix Fake Analytics Tests (CRITICAL)

- [ ] Task: Replace `pivot/src/analytics.test.ts` with real Convex query function tests
  - [ ] Write tests for `getCompletionTrends` — verify date bucketing, status counting, edge cases (empty data, single day, across month boundary)
  - [ ] Write tests for `getAgentUtilization` — verify agent grouping, date bucketing, status filtering
  - [ ] Write tests for `getBottlenecks` — verify sorting by failure rate/duration, empty data, division by zero
  - [ ] Write tests for `getQueueDepth` — verify cumulative snapshots, status filtering correctness
  - [ ] Write tests for `getHookMetrics` — verify phase filtering, severity classification, date bucketing
  - [ ] Write tests for `getSessionMetrics` — verify resumption rate calculation, byDate breakdown, zero-tasks edge case
  - [ ] Delete the old mock-based test file
  - [ ] Verify ≥80% coverage on all Convex analytics query functions

## Phase 2: Restore E2E Test Integrity (HIGH)

- [ ] Task: Investigate `TRIGGER_RUN` / `RUN_STATUS` text leak
  - [ ] Check if these are intentional display strings in the UI or leaked enum values
  - [ ] If leaked enum values: fix the UI component to display proper text
  - [ ] If intentional: document the intentionality in a comment above the test assertion
- [ ] Task: Restore proper assertions in `project.spec.ts`
  - [ ] Restore the drag-and-drop confirmation message assertion
  - [ ] Restore the `File: issue-xxx-parser-bug.md` assertion (or equivalent specificity)
  - [ ] Verify `BLOCKED` check is semantically equivalent to original `Blocked task issue`
  - [ ] Run full e2e suite: confirm all 23 tests pass with proper assertions

## Phase 3: Add Convex Query Unit Tests (HIGH)

- [ ] Task: Create `convex/analytics.test.ts` for `convex/analytics.ts`
  - [ ] Write tests for date-bucketing edge cases (leap years, DST boundaries, month rollover)
  - [ ] Write tests for aggregation correctness (sum, count, grouping)
  - [ ] Write tests for edge cases: zero records, single record, no matching data in range
  - [ ] Write tests for project filtering logic
  - [ ] Verify ≥80% coverage on convex/analytics.ts

## Phase 4: Fix Cost Backfill Hardcoding (MEDIUM)

- [ ] Task: Make `backfillCostRecords` model-aware
  - [ ] Read `model` field from runContracts if available, fall back to `gpt-4o`
  - [ ] Write test for model selection from existing contract data
  - [ ] Write test for fallback behavior when model field is absent

## Phase 5: Audit mockApp.ts Error Suppression (MEDIUM)

- [ ] Task: Investigate suppressed "Failed to load resource" errors
  - [ ] Identify which resources are failing to load
  - [ ] Fix the root cause or document why suppression is necessary
  - [ ] Add inline comment explaining the suppression rationale

## Phase 6: Clean Up Deferred Items (LOW)

- [ ] Task: Verify tech-debt registry completeness
  - [ ] Confirm TD-034 (analytics e2e), TD-035 (perf benchmark), TD-036 (hook markers) accurately document deferred analytics tasks
  - [ ] Add entries for any undone/weakened assertions from Phase 2 if not fixable in this track
  - [ ] Add entry for `backfillCostRecords` model hardcoding if not fixed in Phase 4

## Phase 7: Final Verification

- [ ] Task: Run full test suite
  - [ ] `bun --cwd pivot test` — all tests pass
  - [ ] `bun --cwd frontend test` — all unit tests pass
  - [ ] `bun --cwd frontend test:e2e` — all e2e tests pass
  - [ ] `bun --cwd pivot typecheck` — clean
  - [ ] `bun --cwd frontend check` — clean
  - [ ] Coverage report shows ≥80% on affected modules
