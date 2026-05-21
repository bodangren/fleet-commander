# Plan: Code Audit Remediation

## Phase 1: Dead Code Removal

- [x] Task 1.1: Delete orphaned frontend components (no non-test consumers)
    - [x] Delete `frontend/src/components/NotificationBadge.tsx`
    - [x] Delete `frontend/src/components/NotificationDropdown.tsx`
    - [x] Delete `frontend/src/components/AnalysisResults.tsx`
    - [x] Delete `frontend/src/components/AgentUtilization.tsx`
    - [x] Delete `frontend/src/components/FleetStatusWidget.tsx`
    - [x] Delete `frontend/src/components/OverviewStats.tsx`
    - [x] Delete `frontend/src/components/PipelineExecution.tsx`
    - [x] Delete `frontend/src/components/IssueResolution.tsx`

- [x] Task 1.2: Delete unrouted InsightsPage
    - [x] Delete `frontend/src/pages/InsightsPage.tsx`
    - [x] Delete `frontend/src/pages/InsightsPage.test.tsx`

- [x] Task 1.3: Delete unused legacy KanbanColumn and TaskCard
    - [x] Delete `frontend/src/components/legacy/KanbanColumn.tsx`
    - [x] Delete `frontend/src/components/legacy/KanbanColumn.test.tsx`
    - [x] Delete `frontend/src/components/legacy/TaskCard.tsx`
    - [x] Delete `frontend/src/components/legacy/TaskCard.test.tsx`

- [x] Task 1.4: Delete junk test file
    - [x] Delete `frontend/src/lib/useConvexRealtime.test.ts`

## Phase 2: Logic Bug Fixes

- [x] Task 2.1: Fix insights cost trend always-zero bug
    - [x] In `convex/insights.ts:126`, change `computeCostTrend(filteredSprints, [])` to `computeCostTrend(filteredSprints, costRecords)` (costRecords is fetched on line 137 — reorder to fetch before this call)

- [x] Task 2.2: Fix scheduler.ts stale schema reference
    - [x] Remove `columnId: v.optional(v.id('columns'))` from `taskResponse` validator in `convex/scheduler.ts`

- [x] Task 2.3: Add auth guard to employees.ts
    - [x] Add `await resolveActor(ctx)` to `listEmployeesHandler`
    - [x] Add `await resolveActor(ctx)` to `getEmployeeHandler`
    - [x] Add `await resolveActor(ctx)` to `createEmployeeHandler`
    - [x] Add `await resolveActor(ctx)` to `updateEmployeeStatusHandler`
    - [x] Add `await resolveActor(ctx)` to all other mutation handlers
    - [x] Import `resolveActor` from `./lib/auth`

- [x] Task 2.4: Fix ConvexClient connection leak in useConvexData.ts
    - [x] Store `client` in outer closure variable
    - [x] Call `client.close()` in effect cleanup

## Phase 3: Realtime Hook Updates

- [x] Task 3.1: Update useConvexRealtime.ts hooks to accept filter args
    - [x] `useCompletionTrends(args?)` — accept `{ days?, projectSlug?, agent?, priority? }`
    - [x] `useAgentUtilization(args?)` — accept `{ days?, projectSlug?, agent? }`
    - [x] `useBottlenecks(args?)` — accept `{ days?, projectSlug?, agent?, priority? }`
    - [x] `useQueueDepth(args?)` — accept `{ days?, projectSlug?, agent?, priority? }`
    - [x] `useHookMetrics(args?)` — accept `{ days?, projectSlug? }`
    - [x] `useSessionMetrics(args?)` — accept `{ days?, projectSlug?, agent?, priority? }`
    - [x] `usePhaseBreakdown(args?)` — accept `{ days?, projectSlug?, agent? }`
    - [x] `usePhaseTrends(args?)` — accept `{ days?, projectSlug?, agent? }`
    - [x] `useSlowAgents(args?)` — accept `{ days?, projectSlug? }`
    - [x] `useRegressionAlerts(args?)` — accept `{ days?, projectSlug? }`
    - [x] `useCostByProject(args?)` — accept `{ days?, projectSlug? }`
    - [x] `useCostByAgent(args?)` — accept `{ days?, projectSlug? }`
    - [x] `useCostTrend(args?)` — accept `{ days?, projectSlug? }`
    - [x] `useSessionSavings(args?)` — accept `{ days?, projectSlug? }`
    - [x] `useCostPerTask(args?)` — accept `{ days?, projectSlug? }`

## Phase 4: Wire Analytics Components to Convex

- [x] Task 4.1: `CompletionTrendChart.tsx` — replace fetch with `useCompletionTrends`
- [x] Task 4.2: `AgentHeatmap.tsx` — replace fetch with `useAgentUtilization`
- [x] Task 4.3: `BottleneckChart.tsx` — replace fetch with `useBottlenecks`
- [x] Task 4.4: `QueueDepthChart.tsx` — replace fetch with `useQueueDepth`
- [x] Task 4.5: `HookPerformanceChart.tsx` — replace fetch with `useHookMetrics`
- [x] Task 4.6: `SessionResumptionChart.tsx` — replace fetch with `useSessionMetrics`

## Phase 5: Wire Performance Components to Convex

- [x] Task 5.1: `PhaseBreakdown.tsx` — replace fetch with `usePhaseBreakdown`
- [x] Task 5.2: `PhaseTrends.tsx` — replace fetch with `usePhaseTrends`
- [x] Task 5.3: `SlowAgentLeaderboard.tsx` — replace fetch with `useSlowAgents`
- [x] Task 5.4: `RegressionTrendChart.tsx` — replace fetch with `useRegressionAlerts`

## Phase 6: Wire Cost Components to Convex

- [x] Task 6.1: `CostTrendChart.tsx` (cost/) — replace fetch with `useCostTrend`
- [x] Task 6.2: `CostByProjectChart.tsx` — replace fetch with `useCostByProject`
- [x] Task 6.3: `CostByAgentChart.tsx` — replace fetch with `useCostByAgent`
- [x] Task 6.4: `SessionSavingsWidget.tsx` — replace fetch with `useSessionSavings`
- [x] Task 6.5: `BudgetGauge.tsx` — replace fetch with `useCostPerTask`

## Phase 7: Test Fixes & Tech Debt Registry

- [x] Task 7.1: Fix misleading test name in analytics.test.ts
    - [x] Rename "filters by projectId when provided" to "returns all tasks when projectSlug filter is not applied (removed in schema migration)"

- [x] Task 7.2: Update tech-debt.md
    - [x] Move TD-132 from Open to Resolved
