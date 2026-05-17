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

- [~] **Task: Implement `detectRegressions` function**
  - [~] Compare current window metrics against previous window baseline
  - [~] Flag >20% degradation in duration or >15% drop in completion rate
  - [~] Return list of regression alerts with severity
- [~] **Task: Add `performance_regression` to alert types**
  - [~] Extend `convex/alerts.ts` alertType union
  - [~] Add regression alert creation in `detectRegressions`
- [~] **Task: Write regression tests**
  - [~] Test normal variance (no alert)
  - [~] Test duration regression (alert fired)
  - [~] Test completion rate drop (alert fired)
  - [~] Test insufficient data (no alert, graceful handling)

## Phase 3: Frontend Performance Panel

- [ ] **Task: Create `EmployeePerformancePanel` component**
  - [ ] Bar chart showing avg duration by task kind
  - [ ] Completion rate gauge
  - [ ] Trend sparkline for last 4 windows
  - [ ] Regression alert badges
- [ ] **Task: Wire into ProjectViewPage**
  - [ ] Add "Performance" tab to employee detail view
  - [ ] Fetch data via `useQuery(getEmployeePerformance)`
  - [ ] Loading and error states
- [ ] **Task: Write frontend tests**
  - [ ] Component renders with mock data
  - [ ] Regression alerts display correctly
  - [ ] Empty data state shows appropriate message

## Phase 4: Performance Benchmark and Optimization

- [ ] **Task: Create synthetic 90-day dataset**
  - [ ] Seed script generating 1000+ runs across 30 days
  - [ ] Multiple employees, task kinds, and projects
- [ ] **Task: Benchmark 90-day query**
  - [ ] Measure query time with synthetic dataset
  - [ ] Must complete in <2s (TD-035 requirement)
  - [ ] Add index hints if needed
- [ ] **Task: Verify Phase 4**
  - [ ] Run `bun --cwd frontend test` — all pass
  - [ ] Run `bun --cwd frontend check` — passes
  - [ ] Benchmark script outputs timing results

## Phase 5: Finalize

- [ ] **Task: Update tech-debt.md**
  - [ ] Remove TD-035 (resolved)
  - [ ] Add any new findings
- [ ] **Task: Update lessons-learned.md**
  - [ ] Document performance optimization patterns
- [ ] **Task: Commit and push**
