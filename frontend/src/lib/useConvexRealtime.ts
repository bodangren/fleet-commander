import { getSliceConfig } from './dataAdapter'
import { useConvexQuery } from './useConvexData'

function isConvexEnabled(): boolean {
  return getSliceConfig().projects === 'convex'
}

function useRealtime<T>(queryName: string, args: Record<string, unknown>): T | undefined {
  const enabled = isConvexEnabled()
  return useConvexQuery<T>(queryName, args, enabled)
}

function useRealtimeWithProject(queryName: string, projectId: string | undefined): unknown {
  const enabled = isConvexEnabled() && Boolean(projectId)
  return useConvexQuery(queryName, { projectId: projectId ?? '' }, enabled)
}

function useRealtimeWithParam(
  queryName: string,
  paramName: string,
  paramValue: string | undefined,
): unknown {
  const enabled = isConvexEnabled() && Boolean(paramValue)
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
// Shared filter arg types
// ============================================================

export interface AnalyticsArgs {
  days?: number
  projectSlug?: string
  agent?: string
  priority?: string
}

export interface ProjectSlugArgs {
  days?: number
  projectSlug?: string
}

// ============================================================
// Analytics Realtime Hooks
// ============================================================

export function useCompletionTrends(args?: AnalyticsArgs) {
  return useRealtime('analytics:getCompletionTrends', (args as Record<string, unknown>) ?? {})
}

export function useAgentUtilization(args?: Omit<AnalyticsArgs, 'priority'>) {
  return useRealtime('analytics:getAgentUtilization', (args as Record<string, unknown>) ?? {})
}

export function useBottlenecks(args?: AnalyticsArgs) {
  return useRealtime('analytics:getBottlenecks', (args as Record<string, unknown>) ?? {})
}

export function useQueueDepth(args?: AnalyticsArgs) {
  return useRealtime('analytics:getQueueDepth', (args as Record<string, unknown>) ?? {})
}

export function useHookMetrics(args?: ProjectSlugArgs) {
  return useRealtime('analytics:getHookMetrics', (args as Record<string, unknown>) ?? {})
}

export function useSessionMetrics(args?: AnalyticsArgs) {
  return useRealtime('analytics:getSessionMetrics', (args as Record<string, unknown>) ?? {})
}

// ============================================================
// Performance Realtime Hooks
// ============================================================

export function usePhaseBreakdown(args?: Omit<AnalyticsArgs, 'priority'>) {
  return useRealtime('performance:getPhaseBreakdown', (args as Record<string, unknown>) ?? {})
}

export function usePhaseTrends(args?: Omit<AnalyticsArgs, 'priority'>) {
  return useRealtime('performance:getPhaseTrends', (args as Record<string, unknown>) ?? {})
}

export function useAgentLatencyStats(args?: ProjectSlugArgs) {
  return useRealtime('performance:getAgentLatencyStats', (args as Record<string, unknown>) ?? {})
}

export function useSlowAgents(args?: ProjectSlugArgs) {
  return useRealtime('performance:getSlowAgents', (args as Record<string, unknown>) ?? {})
}

export function useRegressionAlerts(args?: ProjectSlugArgs) {
  return useRealtime('performance:getRegressionAlerts', (args as Record<string, unknown>) ?? {})
}

export function usePerformanceOverview(args?: ProjectSlugArgs) {
  return useRealtime('performance:getPerformanceOverview', (args as Record<string, unknown>) ?? {})
}

// ============================================================
// Cost Realtime Hooks
// ============================================================

export function useCostByProject(args?: ProjectSlugArgs) {
  return useRealtime('costs:getCostByProject', (args as Record<string, unknown>) ?? {})
}

export function useCostByAgent(args?: ProjectSlugArgs) {
  return useRealtime('costs:getCostByAgent', (args as Record<string, unknown>) ?? {})
}

export function useCostTrend(args?: ProjectSlugArgs) {
  return useRealtime('costs:getCostTrend', (args as Record<string, unknown>) ?? {})
}

export function useSessionSavings(args?: ProjectSlugArgs) {
  return useRealtime('costs:getSessionSavings', (args as Record<string, unknown>) ?? {})
}

export function useCostPerTask(args?: ProjectSlugArgs) {
  return useRealtime('costs:getCostPerTask', (args as Record<string, unknown>) ?? {})
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
