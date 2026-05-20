import { getSliceConfig } from './dataAdapter'
import { useConvexQuery } from './useConvexData'

function isConvexEnabled(): boolean {
  return getSliceConfig().projects === 'convex'
}

function useRealtime<T>(queryName: string, args: Record<string, unknown>): T | undefined {
  const enabled = isConvexEnabled()
  if (!enabled) return undefined
  return useConvexQuery<T>(queryName, args, enabled)
}

function useRealtimeWithProject(queryName: string, projectId: string | undefined): unknown {
  const enabled = isConvexEnabled() && Boolean(projectId)
  if (!enabled) return undefined
  return useConvexQuery(queryName, { projectId: projectId ?? '' }, enabled)
}

function useRealtimeWithParam(
  queryName: string,
  paramName: string,
  paramValue: string | undefined,
): unknown {
  const enabled = isConvexEnabled() && Boolean(paramValue)
  if (!enabled) return undefined
  return useConvexQuery(queryName, { [paramName]: paramValue ?? '' }, enabled)
}

// ============================================================
// Dashboard Realtime Hooks
// ============================================================

export function useFleetStatus() {
  return useRealtime('fleet:getFleetStatus', {})
}

export function useBlockedTasks() {
  return useRealtime('fleet:getBlockedTasksAcrossProjects', {})
}

export function useOpenIssues() {
  return useRealtime('fleet:getOpenIssuesAcrossProjects', {})
}

export function useActiveRuns() {
  return useRealtime('fleet:getActiveRunsAcrossProjects', {})
}

export function useAlerts() {
  return useRealtime('fleet:getAlertsWithFilters', {})
}

export function useUnresolvedCriticalCount() {
  return useRealtime('fleet:getUnresolvedCriticalCount', {})
}

export function useDashboardData() {
  return useRealtime('dashboard:getDashboardDataHandler', {})
}

export function useActiveAlerts() {
  return useRealtime('alerts:listActiveAlerts', {})
}

export function useCircuitBreakers() {
  return useRealtime('circuitBreakers:getAllCircuitBreakers', {})
}

export function useInProgressTasks() {
  return useRealtime('taskRecovery:getInProgressTasks', {})
}

export function useReadyTasks() {
  return useRealtime('scheduler:listReadyTasks', {})
}

export function useActiveEmployees() {
  return useRealtime('scheduler:listActiveEmployees', {})
}

// ============================================================
// Analytics Realtime Hooks
// ============================================================

export function useCompletionTrends() {
  return useRealtime('analytics:getCompletionTrends', {})
}

export function useAgentUtilization() {
  return useRealtime('analytics:getAgentUtilization', {})
}

export function useBottlenecks() {
  return useRealtime('analytics:getBottlenecks', {})
}

export function useQueueDepth() {
  return useRealtime('analytics:getQueueDepth', {})
}

export function useHookMetrics() {
  return useRealtime('analytics:getHookMetrics', {})
}

export function useSessionMetrics() {
  return useRealtime('analytics:getSessionMetrics', {})
}

// ============================================================
// Performance Realtime Hooks
// ============================================================

export function usePhaseBreakdown() {
  return useRealtime('performance:getPhaseBreakdown', {})
}

export function usePhaseTrends() {
  return useRealtime('performance:getPhaseTrends', {})
}

export function useAgentLatencyStats() {
  return useRealtime('performance:getAgentLatencyStats', {})
}

export function useSlowAgents() {
  return useRealtime('performance:getSlowAgents', {})
}

export function useRegressionAlerts() {
  return useRealtime('performance:getRegressionAlerts', {})
}

export function usePerformanceOverview() {
  return useRealtime('performance:getPerformanceOverview', {})
}

// ============================================================
// Cost Realtime Hooks
// ============================================================

export function useCostByProject() {
  return useRealtime('costs:getCostByProject', {})
}

export function useCostByAgent() {
  return useRealtime('costs:getCostByAgent', {})
}

export function useCostTrend() {
  return useRealtime('costs:getCostTrend', {})
}

export function useSessionSavings() {
  return useRealtime('costs:getSessionSavings', {})
}

export function useCostPerTask() {
  return useRealtime('costs:getCostPerTask', {})
}

// ============================================================
// Insights Realtime Hooks
// ============================================================

export function useAnalyticsOverview() {
  return useRealtime('insights:getAnalyticsOverview', {})
}

export function useCostOverview() {
  return useRealtime('insights:getCostOverview', {})
}

// ============================================================
// Kanban/Sprint Realtime Hooks
// ============================================================

export function useSprintBoard(projectId: string | undefined) {
  return useRealtimeWithProject('kanban:getSprintBoardHandler', projectId)
}

export function useActiveSprint(projectId: string | undefined) {
  return useRealtimeWithProject('kanban:getActiveSprintHandler', projectId)
}

export function useSprintsByProject(projectId: string | undefined) {
  return useRealtimeWithProject('kanban:getSprintsByProjectHandler', projectId)
}

export function useBacklogTasks(projectId: string | undefined) {
  return useRealtimeWithProject('sprintPlanning:getBacklogTasksHandler', projectId)
}

export function useAgentsForPlanning(projectId: string | undefined) {
  return useRealtimeWithProject('sprintPlanning:getAgentsForPlanningHandler', projectId)
}

export function useProjectStats(projectId: string | undefined) {
  return useRealtimeWithProject('sprintPlanning:getProjectStatsHandler', projectId)
}

export function useSprintsList(projectId: string | undefined) {
  return useRealtimeWithProject('sprints:listSprintsHandler', projectId)
}

export function useSprint(sprintId: string | undefined) {
  return useRealtimeWithParam('sprints:getSprintHandler', 'sprintId', sprintId)
}
