# Quality Remediation — 2026-05-02/03 Audit

## Overview

Deep audit of 18 commits across 5 tracks over 24 hours revealed systematic quality failures: fake tests that mock rather than verify, e2e assertions weakened to match broken UI behavior, and Convex query business logic with zero unit coverage.

## Background

A cross-track review compared every commit to its claimed track tasks. The audit scrutinized implementations for shortcuts, stub tests, meaningless test coverage, and regression risks. Five tracks were examined:

1. **Symphony Pivot** (`symphony_pivot_20260503`) — 10 commits, 10 tasks
2. **Cost Tracking** (`cost_tracking_20260502`) — 2 commits, 39 tasks
3. **Execution Analytics** (`execution_analytics_20260502`) — 2 commits, 49 tasks (in progress)
4. **Frontend E2E Fixes** (`frontend_e2e_fixes_20260502`) — 2 commits, 54 tasks
5. **Fix Failing E2E Tests** (`fix_failing_e2e_20260503`) — 1 commit, 22 tasks

## Remediation Items

### 1. Analytics Tests Are Completely Fake (CRITICAL)

`pivot/src/analytics.test.ts` is a 277-line test file that mocks `ConvexHttpClient` and verifies only that `client.query()` is called with specific string arguments. It exercises ZERO business logic. The actual Convex query functions in `convex/analytics.ts` (355 lines: `getCompletionTrends`, `getAgentUtilization`, `getBottlenecks`, `getQueueDepth`, `getHookMetrics`, `getSessionMetrics`) have no real unit tests whatsoever.

- **Impact**: All date arithmetic, grouping, aggregation, and counting logic is unverified. Any bug in the query handlers will pass CI.
- **Root cause**: Tests were written against the mock interface, not the actual implementations. This pattern bypasses TDD entirely — the "test" validates nothing about the system under test.

### 2. E2E Test Fixes Weakened Assertions (HIGH)

Commit `9dde82c` ("Fix three failing e2e tests") made the following changes:

| Original Assertion | Replaced With | Issue |
|---|---|---|
| `getByText('Project detail')` | `getByText('Demo Project')` | OK — actual project name |
| `getByRole('button', { name: 'Trigger Orchestrator Run' })` | `getByRole('button', { name: 'TRIGGER_RUN' })` | **Suspicious**: `TRIGGER_RUN` looks like an enum key or i18n constant leaking to UI |
| `getByText('Run status')` | `getByText('RUN_STATUS')` | **Suspicious**: Same enum leak pattern |
| `getByText('Blocked task issue')` | `getByText('BLOCKED')` | **Weakened**: Changed from a specific descriptive check to a vague keyword |
| `getByText('File: issue-123-parser-bug.md')` | *(removed entirely)* | **DEAD**: Assertion lost entirely |
| `getByText('Updated task-todo-1 to done.')` | `expect(source).toBeVisible()` | **Weakened**: Drag confirmation message no longer verified |

The `TRIGGER_RUN`/`RUN_STATUS`/`BLOCKED` strings are likely internal enum values or translation keys leaking through the UI without proper display-name mapping. Instead of fixing the root cause (the UI rendering raw keys), the tests were rewritten to accept broken behavior.

### 3. No Integration Tests Anywhere (HIGH)

Across all 5 tracks, zero tests flow through the full stack (Convex query → pivot API route → frontend component). Every "test" file tests modules in isolation, often against mocked interfaces that don't validate real behavior.

- Count of test files added: 13 (`*.test.ts`, `*.test.tsx`)
- Count of files testing actual vs mocked Convex: 0
- Count of files testing API route behavior through HTTP: 0

### 4. Convex Analytics Query Logic Untested (HIGH)

`convex/analytics.ts` contains 355 lines of query handler logic (date bucketing, agent aggregation, bottleneck ranking, queue snapshots, hook metrics, session metrics) with **zero** unit tests. The pivot-side `analytics.test.ts` tests the HTTP client mock layer, not the queries themselves.

### 5. Backfill Mutation Hardcodes Model (MEDIUM)

`convex/costs.ts:backfillCostRecords` uses hardcoded `'gpt-4o'` model for ALL backfilled records regardless of which model was actually used in historical executions. This produces inaccurate cost data for backfilled records.

### 6. mockApp.ts Suppresses Real Errors (MEDIUM)

`frontend/e2e/helpers/mockApp.ts` added `text.includes('Failed to load resource')` to the console error suppression filter. This silences real resource loading failures rather than investigating and fixing them.

### 7. Plan.md Files Modified Across 17 Future Tracks (MEDIUM)

Commit `a716e5f` (messaged "feat(cost_tracking)") edits `plan.md` for 17 unrelated future tracks: `adaptive_dispatching`, `agent_marketplace`, `ai_retrospective`, `api_documentation`, `auth_authorization`, `backlog_grooming`, `continuous_orchestration`, `multi_user`, `notification_system`, `observability_telemetry`, `performance_profiling`, `plugin_system`, `project_templates`, `self_healing`, `workload_balancer`, plus several others. This is scope creep — unrelated bulk edits bundled into a feature commit without documentation.

### 8. Execution Analytics Has 3 Deferred Tasks Without Tracking (LOW)

`execution_analytics_20260502/plan.md` defers e2e tests for filter interactions, performance benchmarks, and hook failure markers on completion trend chart. These are marked with `[ ]` but never registered in tech-debt.md — they appear as plan tasks that were simply never done.

### 9. Lessons-Learned & Tech-Debt Underutilized (LOW)

Only 2 non-trivial entries were added to `lessons-learned.md` across 24 hours of high-volume work. Tech-debt gained only 3 entries (TD-034 through TD-036) despite known deferred items across multiple tracks.

## Acceptance Criteria

- [ ] `pivot/src/analytics.test.ts` rewritten to test actual Convex query functions or deleted and replaced with function-level tests
- [ ] `convex/analytics.ts` query functions have unit tests covering date bucketing, aggregation, and edge cases (coverage ≥80%)
- [ ] E2e tests for Project View page assert on proper display text (not raw enum keys)
- [ ] Root cause of `TRIGGER_RUN`/`RUN_STATUS` leak investigated — UI fix or confirmed as intentional
- [ ] Removed e2e assertions (`File: issue-xxx-parser-bug.md`, drag confirmation) restored or replaced with equivalent coverage
- [ ] `mockApp.ts` console error filter documented with explanation for suppressed errors
- [ ] `backfillCostRecords` model parameter made configurable or documented as intentional limitation
- [ ] Deferred analytics tasks registered in tech-debt.md (TD-034 already exists, verify TD-035 and TD-036 completeness)
- [ ] All 13 new test files from the audit period pass after fixes
- [ ] Full e2e suite passes without suppressed assertions

## Out of Scope

- Adding full integration/end-to-end tests (deferred to separate track)
- Fixing the 17 plan.md files modified in scope-creep commit (revert or separate track)
- Performance benchmarking (separate track)
- Adding unit tests for frontend chart components
