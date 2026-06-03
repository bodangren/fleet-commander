import { useRealtime, type ProjectSlugArgs } from './core'

/**
 * Returns cost breakdown by project.
 */
export function useCostByProject(args?: ProjectSlugArgs) {
  return useRealtime('costs:getCostByProject', args ?? {})
}

/**
 * Returns cost breakdown by agent.
 */
export function useCostByAgent(args?: ProjectSlugArgs) {
  return useRealtime('costs:getCostByAgent', args ?? {})
}

/**
 * Returns cost trend over time.
 */
export function useCostTrend(args?: ProjectSlugArgs) {
  return useRealtime('costs:getCostTrend', args ?? {})
}

/**
 * Returns session cost savings.
 */
export function useSessionSavings(args?: ProjectSlugArgs) {
  return useRealtime('costs:getSessionSavings', args ?? {})
}

/**
 * Returns cost per task metrics.
 */
export function useCostPerTask(args?: ProjectSlugArgs) {
  return useRealtime('costs:getCostPerTask', args ?? {})
}
