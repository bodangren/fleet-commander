import { useRealtime } from './core'

/**
 * Get current fleet status across all projects.
 */
export function useFleetStatus() {
  return useRealtime('fleet:getFleetStatus', {})
}

/**
 * Get tasks blocked across all projects.
 */
export function useBlockedTasks() {
  return useRealtime('fleet:getBlockedTasksAcrossProjects', {})
}

/**
 * Get open issues across all projects.
 */
export function useOpenIssues() {
  return useRealtime('fleet:getOpenIssuesAcrossProjects', {})
}

/**
 * Get currently active pipeline runs across all projects.
 */
export function useActiveRuns() {
  return useRealtime('fleet:getActiveRunsAcrossProjects', {})
}

/**
 * Get alerts with optional filtering.
 */
export function useAlerts() {
  return useRealtime('fleet:getAlertsWithFilters', {})
}

/**
 * Get count of unresolved critical issues.
 */
export function useUnresolvedCriticalCount() {
  return useRealtime('fleet:getUnresolvedCriticalCount', {})
}

/**
 * Get aggregated dashboard data for main view.
 */
export function useDashboardData() {
  return useRealtime('dashboard:getDashboardDataHandler', {})
}

/**
 * Get currently active alerts.
 */
export function useActiveAlerts() {
  return useRealtime('alerts:listActiveAlerts', {})
}

/**
 * Get all circuit breaker states.
 */
export function useCircuitBreakers() {
  return useRealtime('circuitBreakers:getAllCircuitBreakers', {})
}

/**
 * Get tasks currently in progress.
 */
export function useInProgressTasks() {
  return useRealtime('taskRecovery:getInProgressTasks', {})
}

/**
 * Get tasks ready to be scheduled.
 */
export function useReadyTasks() {
  return useRealtime('scheduler:listReadyTasks', {})
}

/**
 * Get currently active employees/agents.
 */
export function useActiveEmployees() {
  return useRealtime('scheduler:listActiveEmployees', {})
}
