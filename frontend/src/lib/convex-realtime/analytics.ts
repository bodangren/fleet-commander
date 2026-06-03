import { useRealtime, type AnalyticsArgs, type ProjectSlugArgs } from './core'

/**
 * Returns completion trends over time.
 */
export function useCompletionTrends(args?: AnalyticsArgs) {
  return useRealtime('analytics:getCompletionTrends', args ?? {})
}

/**
 * Returns agent utilization metrics.
 */
export function useAgentUtilization(args?: Omit<AnalyticsArgs, 'priority'>) {
  return useRealtime('analytics:getAgentUtilization', args ?? {})
}

/**
 * Returns bottleneck analysis.
 */
export function useBottlenecks(args?: AnalyticsArgs) {
  return useRealtime('analytics:getBottlenecks', args ?? {})
}

/**
 * Returns queue depth metrics.
 */
export function useQueueDepth(args?: AnalyticsArgs) {
  return useRealtime('analytics:getQueueDepth', args ?? {})
}

/**
 * Returns hook performance metrics.
 */
export function useHookMetrics(args?: ProjectSlugArgs) {
  return useRealtime('analytics:getHookMetrics', args ?? {})
}

/**
 * Returns session resumption metrics.
 */
export function useSessionMetrics(args?: AnalyticsArgs) {
  return useRealtime('analytics:getSessionMetrics', args ?? {})
}
