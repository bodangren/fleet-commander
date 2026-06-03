import { useRealtime, type AnalyticsArgs, type ProjectSlugArgs } from './core'

/**
 * Returns pipeline phase breakdown.
 */
export function usePhaseBreakdown(args?: Omit<AnalyticsArgs, 'priority'>) {
  return useRealtime('performance:getPhaseBreakdown', args ?? {})
}

/**
 * Returns pipeline phase trends over time.
 */
export function usePhaseTrends(args?: Omit<AnalyticsArgs, 'priority'>) {
  return useRealtime('performance:getPhaseTrends', args ?? {})
}

/**
 * Returns agent latency statistics.
 */
export function useAgentLatencyStats(args?: ProjectSlugArgs) {
  return useRealtime('performance:getAgentLatencyStats', args ?? {})
}

/**
 * Returns slow agent leaderboard.
 */
export function useSlowAgents(args?: ProjectSlugArgs) {
  return useRealtime('performance:getSlowAgents', args ?? {})
}

/**
 * Returns regression alerts.
 */
export function useRegressionAlerts(args?: ProjectSlugArgs) {
  return useRealtime('performance:getRegressionAlerts', args ?? {})
}

/**
 * Returns performance overview.
 */
export function usePerformanceOverview(args?: ProjectSlugArgs) {
  return useRealtime('performance:getPerformanceOverview', args ?? {})
}
