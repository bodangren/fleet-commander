import { useRealtime } from './core'

/**
 * Returns analytics overview for insights page.
 */
export function useAnalyticsOverview() {
  return useRealtime('insights:getAnalyticsOverview', {})
}

/**
 * Returns cost overview for insights page.
 */
export function useCostOverview() {
  return useRealtime('insights:getCostOverview', {})
}
