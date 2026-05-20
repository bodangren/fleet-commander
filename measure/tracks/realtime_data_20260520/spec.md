# Specification: Realtime Data & Schema Index Audit

## Overview

The Convex backend has 142 query functions but only ~27 are subscribed to via realtime on the frontend. Additionally, 3 tables (`projects`, `abTests`, `providers`) lack indexes entirely. This track adds missing schema indexes and wires all high-priority dashboard/live data queries to realtime subscriptions.

## Functional Requirements

### FR1: Add Missing Schema Indexes
- `projects` table: add `by_name` index
- `abTests` table: add `by_status` and `by_sprint` indexes
- `providers` table: add `by_name` and `by_status` indexes

### FR2: Wire Dashboard Queries to Realtime
All queries used by the dashboard page must use `useConvexQuery` for live updates:
- `fleet:getFleetStatus`
- `fleet:getBlockedTasksAcrossProjects`
- `fleet:getOpenIssuesAcrossProjects`
- `fleet:getActiveRunsAcrossProjects`
- `fleet:getAlertsWithFilters`
- `fleet:getUnresolvedCriticalCount`
- `dashboard:getDashboardDataHandler`
- `alerts:listActiveAlerts`
- `circuitBreakers:getAllCircuitBreakers`
- `taskRecovery:getInProgressTasks`
- `scheduler:listReadyTasks`
- `scheduler:listActiveEmployees`

### FR3: Wire Analytics/Performance Queries to Realtime
- `analytics:getCompletionTrends`
- `analytics:getAgentUtilization`
- `analytics:getBottlenecks`
- `analytics:getQueueDepth`
- `analytics:getHookMetrics`
- `analytics:getSessionMetrics`
- `performance:getPhaseBreakdown`
- `performance:getPhaseTrends`
- `performance:getAgentLatencyStats`
- `performance:getSlowAgents`
- `performance:getRegressionAlerts`
- `performance:getPerformanceOverview`
- `costs:getCostByProject`
- `costs:getCostByAgent`
- `costs:getCostTrend`
- `costs:getSessionSavings`
- `costs:getCostPerTask`
- `insights:getAnalyticsOverview`
- `insights:getCostOverview`

### FR4: Wire Kanban/Sprint Queries to Realtime
- `kanban:getSprintBoardHandler`
- `kanban:getActiveSprintHandler`
- `kanban:getSprintsByProjectHandler`
- `sprintPlanning:getBacklogTasksHandler`
- `sprintPlanning:getAgentsForPlanningHandler`
- `sprintPlanning:getProjectStatsHandler`
- `sprints:listSprintsHandler`
- `sprints:getSprintHandler`

### FR5: Create Realtime Hook Layer
Create a new `useConvexRealtime.ts` module that provides typed hooks for all newly-realtime queries, following the existing `useConvexQuery` pattern but with proper TypeScript generics and consistent error handling.

### FR6: Update Frontend Components to Use Realtime Hooks
Replace any direct data fetching in dashboard, analytics, performance, kanban, and sprint components with the new realtime hooks.

## Non-Functional Requirements

- All realtime hooks must support the existing `getSliceConfig()` enable/disable pattern
- No changes to Convex query function signatures (only frontend subscription changes)
- Schema migrations must be backward-compatible (new indexes only, no field changes)
- Existing `useConvexData.ts` hooks must continue to work unchanged

## Acceptance Criteria

1. [ ] Schema has indexes on all 40+ tables (zero tables without indexes)
2. [ ] All 45+ high-priority queries have corresponding `useConvexQuery` subscriptions
3. [ ] New `useConvexRealtime.ts` module exports typed hooks for all realtime queries
4. [ ] Dashboard page uses realtime hooks for all live data
5. [ ] Analytics page uses realtime hooks for all chart data
6. [ ] Kanban board uses realtime hooks for board state
7. [ ] TypeScript compilation passes with no errors
8. [ ] All existing tests pass
9. [ ] No regressions in data loading behavior

## Out of Scope

- Migrating from `ConvexClient.onUpdate` to `useQuery` from `convex/react` (separate track)
- Adding realtime to history/retrospective queries (static data, not needed)
- Changing Convex query function implementations
- Adding new Convex tables or fields
