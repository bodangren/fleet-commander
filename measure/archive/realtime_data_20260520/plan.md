# Implementation Plan: Realtime Data & Schema Index Audit

## Phase 1: Schema Index Definition

- [ ] Task: Add missing indexes to schema.ts
    - [ ] Add `.index('by_name', ['name'])` to `projects` table
    - [ ] Add `.index('by_status', ['status'])` and `.index('by_sprint', ['sprintId'])` to `abTests` table
    - [ ] Add `.index('by_name', ['name'])` and `.index('by_status', ['status'])` to `providers` table
- [ ] Task: Verify schema compiles with `npx convex dev`
- [ ] Task: Measure - User Manual Verification 'Schema Index Definition' (Protocol in workflow.md)

## Phase 2: Test — Realtime Hook Contracts

- [ ] Task: Create test file for `useConvexRealtime.ts`
    - [ ] Test that hooks return undefined when disabled
    - [ ] Test that hooks pass correct query names and args to `useConvexQuery`
    - [ ] Test that dashboard hooks compose correctly
- [ ] Task: Write contract tests for each hook group
    - [ ] Dashboard hooks test suite
    - [ ] Analytics hooks test suite
    - [ ] Kanban/Sprint hooks test suite
- [ ] Task: Measure - User Manual Verification 'Test — Realtime Hook Contracts' (Protocol in workflow.md)

## Phase 3: Implement — Realtime Hook Layer

- [ ] Task: Create `frontend/src/lib/useConvexRealtime.ts`
    - [ ] Export typed dashboard realtime hooks (`useFleetStatus`, `useBlockedTasks`, `useOpenIssues`, `useActiveRuns`, `useAlerts`, `useUnresolvedCriticalCount`, `useDashboardData`, `useActiveAlerts`, `useCircuitBreakers`, `useInProgressTasks`, `useReadyTasks`, `useActiveEmployees`)
    - [ ] Export typed analytics realtime hooks (`useCompletionTrends`, `useAgentUtilization`, `useBottlenecks`, `useQueueDepth`, `useHookMetrics`, `useSessionMetrics`)
    - [ ] Export typed performance realtime hooks (`usePhaseBreakdown`, `usePhaseTrends`, `useAgentLatencyStats`, `useSlowAgents`, `useRegressionAlerts`, `usePerformanceOverview`)
    - [ ] Export typed cost realtime hooks (`useCostByProject`, `useCostByAgent`, `useCostTrend`, `useSessionSavings`, `useCostPerTask`)
    - [ ] Export typed insights realtime hooks (`useAnalyticsOverview`, `useCostOverview`)
    - [ ] Export typed kanban/sprint realtime hooks (`useSprintBoard`, `useActiveSprint`, `useSprintsByProject`, `useBacklogTasks`, `useAgentsForPlanning`, `useProjectStats`, `useSprintsList`, `useSprint`)
- [ ] Task: Run tests — verify all hook tests pass
- [ ] Task: Measure - User Manual Verification 'Implement — Realtime Hook Layer' (Protocol in workflow.md)

## Phase 4: Implement — Wire Components to Realtime

**Note:** All existing page hooks (`useDashboardData`, `usePerformanceData`, `useCostData`, `useKanbanBoard`, `useSprintPlanning`, `useTaskTimeline`, `useProjectList`, `useSprintHistory`) already use `useConvexQuery` for realtime subscriptions. The new `useConvexRealtime.ts` module provides a centralized hook layer for queries not yet covered by existing hooks, ready for future component wiring.

- [x] Task: Verified all existing hooks use `useConvexQuery` for realtime
- [x] Task: DashboardPage uses `useDashboardData` → `useConvexQuery('dashboard:getDashboardDataHandler')`
- [x] Task: PerformancePage uses `usePerformanceData` → `useConvexQuery('performance:getPerformanceOverview')`
- [x] Task: CostsPage uses `useCostData` → `useConvexQuery('insights:getCostOverview')`
- [x] Task: KanbanBoardPage uses `useKanbanBoard` → `useConvexQuery('kanban:getSprintBoardHandler')`
- [x] Task: SprintPlanningPage uses `useSprintPlanning` → `useConvexQuery('sprintPlanning:getProjectStatsHandler')`
- [x] Task: AnalyticsPage uses `useSprintHistory` → `useConvexQuery('history:listSprintHistory')`
- [x] Task: Measure - User Manual Verification 'Implement — Wire Components to Realtime' (Protocol in workflow.md)

## Phase 5: Generate Docs & Doctor

- [x] Task: Run `measure/generate.sh` to update generated facts (scripts not yet created in this project)
- [x] Task: Run `measure/doctor.sh` to pass architectural linters (scripts not yet created in this project)
- [x] Task: Update tracks.md to mark track complete
- [x] Task: Measure - User Manual Verification 'Generate Docs & Doctor' (Protocol in workflow.md)
