import { getSliceConfig } from './dataAdapter'
import { useConvexQuery } from './useConvexData'

/**
 * Check if Convex backend is enabled via slice config
 * @returns Whether Convex is enabled for project data
 */
function isConvexEnabled(): boolean {
  return getSliceConfig().projects === 'convex'
}

/**
 * Generic real-time query hook with enable/disable flag
 * @param queryName - Name of the Convex query
 * @param args - Arguments to pass to the query
 * @returns Query result or undefined if disabled
 */
function useRealtime<T>(queryName: string, args: Record<string, unknown>): T | undefined {
  const enabled = isConvexEnabled()
  return useConvexQuery<T>(queryName, args, enabled)
}

/**
 * Real-time query hook that auto-enables when projectId is provided
 * @param queryName - Name of the Convex query
 * @param projectId - Project ID to filter by (auto-enables if provided)
 * @returns Query result
 */
function useRealtimeWithProject(queryName: string, projectId: string | undefined): unknown {
  const enabled = isConvexEnabled() && Boolean(projectId)
  return useConvexQuery(queryName, { projectId: projectId ?? '' }, enabled)
}

/**
 * Real-time query hook with dynamic parameter filtering
 * @param queryName - Name of the Convex query
 * @param paramName - Name of the parameter to add to args
 * @param paramValue - Value of the parameter (auto-enables if provided)
 * @returns Query result
 */
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

/**
 * Get current fleet status across all projects
 * @returns Fleet status data
 */
export function useFleetStatus() {
  return useRealtime('fleet:getFleetStatus', {})
}

/**
 * Get tasks blocked across all projects
 * @returns Blocked tasks data
 */
export function useBlockedTasks() {
  return useRealtime('fleet:getBlockedTasksAcrossProjects', {})
}

/**
 * Get open issues across all projects
 * @returns Open issues data
 */
export function useOpenIssues() {
  return useRealtime('fleet:getOpenIssuesAcrossProjects', {})
}

/**
 * Get currently active pipeline runs across all projects
 * @returns Active runs data
 */
export function useActiveRuns() {
  return useRealtime('fleet:getActiveRunsAcrossProjects', {})
}

/**
 * Get alerts with optional filtering
 * @returns Alerts data
 */
export function useAlerts() {
  return useRealtime('fleet:getAlertsWithFilters', {})
}

/**
 * Get count of unresolved critical issues
 * @returns Count of unresolved critical issues
 */
export function useUnresolvedCriticalCount() {
  return useRealtime('fleet:getUnresolvedCriticalCount', {})
}

/**
 * Get aggregated dashboard data for main view
 * @returns Dashboard data
 */
export function useDashboardData() {
  return useRealtime('dashboard:getDashboardDataHandler', {})
}

/**
 * Get currently active alerts
 * @returns Active alerts data
 */
export function useActiveAlerts() {
  return useRealtime('alerts:listActiveAlerts', {})
}

/**
 * Get all circuit breaker states
 * @returns Circuit breakers data
 */
export function useCircuitBreakers() {
  return useRealtime('circuitBreakers:getAllCircuitBreakers', {})
}

/**
 * Get tasks currently in progress
 * @returns In-progress tasks data
 */
export function useInProgressTasks() {
  return useRealtime('taskRecovery:getInProgressTasks', {})
}

/**
 * Get tasks ready to be scheduled
 * @returns Ready tasks data
 */
export function useReadyTasks() {
  return useRealtime('scheduler:listReadyTasks', {})
}

/**
 * Get currently active employees/agents
 * @returns Active employees data
 */
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

/**
 * React hook completion trends
 * @param args - Optional analytics arguments (days, projectSlug, agent, priority)
 * @returns Completion trends data
 */
export function useCompletionTrends(args?: AnalyticsArgs) {
  return useRealtime('analytics:getCompletionTrends', (args as Record<string, unknown>) ?? {})
}

/**
 * React hook agent utilization
 * @param args - Optional analytics arguments (days, projectSlug, agent)
 * @returns Agent utilization data
 */
export function useAgentUtilization(args?: Omit<AnalyticsArgs, 'priority'>) {
  return useRealtime('analytics:getAgentUtilization', (args as Record<string, unknown>) ?? {})
}

/**
 * React hook bottlenecks
 * @param args - Optional analytics arguments (days, projectSlug, agent, priority)
 * @returns Bottlenecks data
 */
export function useBottlenecks(args?: AnalyticsArgs) {
  return useRealtime('analytics:getBottlenecks', (args as Record<string, unknown>) ?? {})
}

/**
 * React hook queue depth
 * @param args - Optional analytics arguments (days, projectSlug, agent, priority)
 * @returns Queue depth data
 */
export function useQueueDepth(args?: AnalyticsArgs) {
  return useRealtime('analytics:getQueueDepth', (args as Record<string, unknown>) ?? {})
}

/**
 * React hook hook metrics
 * @param args - Optional project slug args (days, projectSlug)
 * @returns Hook metrics data
 */
export function useHookMetrics(args?: ProjectSlugArgs) {
  return useRealtime('analytics:getHookMetrics', (args as Record<string, unknown>) ?? {})
}

/**
 * React hook session metrics
 * @param args - Optional analytics arguments (days, projectSlug, agent, priority)
 * @returns Session metrics data
 */
export function useSessionMetrics(args?: AnalyticsArgs) {
  return useRealtime('analytics:getSessionMetrics', (args as Record<string, unknown>) ?? {})
}

// ============================================================
// Performance Realtime Hooks
// ============================================================

/**
 * React hook phase breakdown
 * @param args - Optional analytics arguments (days, projectSlug, agent)
 * @returns Phase breakdown data
 */
export function usePhaseBreakdown(args?: Omit<AnalyticsArgs, 'priority'>) {
  return useRealtime('performance:getPhaseBreakdown', (args as Record<string, unknown>) ?? {})
}

/**
 * React hook phase trends
 * @param args - Optional analytics arguments (days, projectSlug, agent)
 * @returns Phase trends data
 */
export function usePhaseTrends(args?: Omit<AnalyticsArgs, 'priority'>) {
  return useRealtime('performance:getPhaseTrends', (args as Record<string, unknown>) ?? {})
}

/**
 * React hook agent latency stats
 * @param args - Optional project slug args (days, projectSlug)
 * @returns Agent latency stats data
 */
export function useAgentLatencyStats(args?: ProjectSlugArgs) {
  return useRealtime('performance:getAgentLatencyStats', (args as Record<string, unknown>) ?? {})
}

/**
 * React hook slow agents
 * @param args - Optional project slug args (days, projectSlug)
 * @returns Slow agents data
 */
export function useSlowAgents(args?: ProjectSlugArgs) {
  return useRealtime('performance:getSlowAgents', (args as Record<string, unknown>) ?? {})
}

/**
 * React hook regression alerts
 * @param args - Optional project slug args (days, projectSlug)
 * @returns Regression alerts data
 */
export function useRegressionAlerts(args?: ProjectSlugArgs) {
  return useRealtime('performance:getRegressionAlerts', (args as Record<string, unknown>) ?? {})
}

/**
 * React hook performance overview
 * @param args - Optional project slug args (days, projectSlug)
 * @returns Performance overview data
 */
export function usePerformanceOverview(args?: ProjectSlugArgs) {
  return useRealtime('performance:getPerformanceOverview', (args as Record<string, unknown>) ?? {})
}

// ============================================================
// Cost Realtime Hooks
// ============================================================

/**
 * React hook cost by project
 * @param args - Optional project slug args (days, projectSlug)
 * @returns Cost by project data
 */
export function useCostByProject(args?: ProjectSlugArgs) {
  return useRealtime('costs:getCostByProject', (args as Record<string, unknown>) ?? {})
}

/**
 * React hook cost by agent
 */
export function useCostByAgent(args?: ProjectSlugArgs) {
  return useRealtime('costs:getCostByAgent', (args as Record<string, unknown>) ?? {})
}

/**
 * React hook cost trend
 */
export function useCostTrend(args?: ProjectSlugArgs) {
  return useRealtime('costs:getCostTrend', (args as Record<string, unknown>) ?? {})
}

/**
 * React hook session savings
 */
export function useSessionSavings(args?: ProjectSlugArgs) {
  return useRealtime('costs:getSessionSavings', (args as Record<string, unknown>) ?? {})
}

/**
 * React hook cost per task
 */
export function useCostPerTask(args?: ProjectSlugArgs) {
  return useRealtime('costs:getCostPerTask', (args as Record<string, unknown>) ?? {})
}

// ============================================================
// Insights Realtime Hooks
// ============================================================

/**
 * React hook analytics overview
 */
export function useAnalyticsOverview() {
  return useRealtime('insights:getAnalyticsOverview', {})
}

/**
 * React hook cost overview
 */
export function useCostOverview() {
  return useRealtime('insights:getCostOverview', {})
}

// ============================================================
// Kanban/Sprint Realtime Hooks
// ============================================================

/**
 * React hook sprint board
 */
export function useSprintBoard(projectId: string | undefined) {
  return useRealtimeWithProject('kanban:getSprintBoardHandler', projectId)
}

/**
 * React hook active sprint
 */
export function useActiveSprint(projectId: string | undefined) {
  return useRealtimeWithProject('kanban:getActiveSprintHandler', projectId)
}

/**
 * React hook sprints by project
 */
export function useSprintsByProject(projectId: string | undefined) {
  return useRealtimeWithProject('kanban:getSprintsByProjectHandler', projectId)
}

/**
 * React hook backlog tasks
 */
export function useBacklogTasks(projectId: string | undefined) {
  return useRealtimeWithProject('sprintPlanning:getBacklogTasksHandler', projectId)
}

/**
 * React hook agents for planning
 */
export function useAgentsForPlanning(projectId: string | undefined) {
  return useRealtimeWithProject('sprintPlanning:getAgentsForPlanningHandler', projectId)
}

/**
 * React hook project stats
 */
export function useProjectStats(projectId: string | undefined) {
  return useRealtimeWithProject('sprintPlanning:getProjectStatsHandler', projectId)
}

/**
 * React hook sprints list
 */
export function useSprintsList(projectId: string | undefined) {
  return useRealtimeWithProject('sprints:listSprintsHandler', projectId)
}

/**
 * React hook sprint
 */
export function useSprint(sprintId: string | undefined) {
  return useRealtimeWithParam('sprints:getSprintHandler', 'sprintId', sprintId)
}
