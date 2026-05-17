# Implementation Plan: Employee Performance Analytics

## Phase 1: Performance Data Model and Convex Queries

- [x] **Task: Define performance schema**
  - [x] Create `performanceBaselines` table in `convex/schema.ts`
  - [x] Fields: `employeeId`, `projectSlug`, `taskKind`, `windowStart`, `windowEnd`, `avgDurationMs`, `p50DurationMs`, `p95DurationMs`, `completionRate`, `sampleCount`
  - [x] Add composite indexes for `(employeeId, projectSlug, taskKind)`
- [x] **Task: Implement `computeBaselines` function**
  - [x] Query `runs` table for completed tasks in time window
  - [x] Compute avg, p50, p95 duration per employee+taskKind
  - [x] Compute completion rate (completed / total assigned)
  - [x] Write baseline snapshots to `performanceBaselines` table
- [x] **Task: Implement `getEmployeePerformance` query**
  - [x] Accept `employeeId`, `projectId`, `windowDays` params
  - [x] Return latest baseline + raw run data for the window
  - [x] Handle empty data gracefully (return null with message)
- [x] **Task: Verify Phase 1**
  - [x] Run `bun --cwd pivot test` — all pass (17 performance tests green)
  - [x] Run `bun --cwd pivot typecheck` — passes (TD-069 added for test TS errors)
  - [x] Commit SHA: `c0b8b71`

## Phase 2: Regression Detection

- [x] **Task: Implement `detectRegressions` function**
  - [x] Compare current window metrics against previous window baseline
  - [x] Flag >20% degradation in duration or >15% drop in completion rate
  - [x] Return list of regression alerts with severity
- [x] **Task: Add `performance_regression` to alert types**
  - [x] Extend `convex/alerts.ts` alertType union
  - [x] Add regression alert creation in `detectRegressions`
- [x] **Task: Write regression tests**
  - [x] Test normal variance (no alert)
  - [x] Test duration regression (alert fired)
  - [x] Test completion rate drop (alert fired)
  - [x] Test insufficient data (no alert, graceful handling)
  - [x] Commit SHA: `4449b05e` (see TD-071: severity threshold conflict)
- [x] **Task: Verify Phase 2**
  - [x] `evaluateRegression.test.ts` — 12/13 pass
  - [x] `detectRegressions.test.ts` — 3/4 pass (1 failure: TD-071)
  - [x] TD-071 added to tech-debt.md (Critical): irreconcilable severity thresholds between tests

## Phase 3: Frontend Performance Panel

- [x] **Task: Create `EmployeePerformancePanel` component**
  - [x] Bar chart showing avg duration by task kind
  - [x] Completion rate gauge
  - [x] Trend sparkline for last 4 windows
  - [x] Regression alert badges
- [x] **Task: Wire into ProjectViewPage**
  - [x] Add "Performance" tab to employee detail view
  - [x] Fetch data via `useQuery(getEmployeePerformance)`
  - [x] Loading and error states
- [x] **Task: Write frontend tests**
  - [x] Component renders with mock data
  - [x] Regression alerts display correctly
  - [x] Empty data state shows appropriate message
  - [x] Commit SHA: `3f76e32`

## Phase 4: Performance Benchmark and Optimization

- [x] **Task: Create synthetic 90-day dataset**
  - [x] Seed script generating 1000+ runs across 30 days
  - [x] Multiple employees, task kinds, and projects
  - [x] Commit SHA: `bdfe3bd`
- [x] **Task: Benchmark 90-day query**
  - [x] Measure query time with synthetic dataset
  - [x] Must complete in <2s (TD-035 requirement)
  - [x] Add index hints if needed
  - [x] Commit SHA: `bdfe3bd`
- [x] **Task: Verify Phase 4**
  - [x] Run `bun --cwd frontend test` — all pass (65 test files, 432 tests)
  - [x] Run `bun --cwd frontend check` — passes
  - [x] Benchmark script outputs timing results

## Phase 5: Finalize

- [x] **Task: Update tech-debt.md**
  - [x] Remove TD-035 (resolved)
  - [x] Add TD-074, TD-075 for Phase 5 findings
- [x] **Task: Update lessons-learned.md**
  - [x] Document performance optimization patterns
- [x] **Task: Commit and push**
  - [x] Commit SHA: `6515859`
