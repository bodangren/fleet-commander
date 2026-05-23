# Employee Performance Analytics

## Problem

Fleet Commander has no visibility into individual employee performance over time. Managers cannot identify which employees are most effective for specific task types, track improvement trends, or spot underperformers. TD-035 explicitly calls out the lack of performance benchmarks.

## Goals

1. Per-employee dashboard showing completion rate, avg duration, success rate
2. Trend analysis over configurable time windows (7d, 30d, 90d)
3. Task-kind breakdown showing which employee excels at which work type
4. Performance regression alerts when metrics drop >20% from baseline

## Non-Goals

- Cross-project employee comparison (employees belong to specific projects)
- Automated reassignment based on performance (human in the loop principle)
- Real-time metrics (batch-computed on demand is acceptable)

## Acceptance Criteria

- [ ] `convex/employees.ts` has `getEmployeePerformance` query with time window param
- [ ] `convex/performance.ts` has `computeBaselines` and `detectRegressions` functions
- [ ] Frontend `EmployeePerformancePanel` component renders metrics per employee
- [ ] 90-day range query completes in <2s (addresses TD-035)
- [ ] 15+ unit tests for performance computation logic
- [ ] E2E test verifying panel renders with real data
