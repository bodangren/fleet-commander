import type { PerformanceData } from '@/__fixtures__/performanceFixtures'
import { useConvexQuery } from '@/lib/useConvexData'

/**
 * Hook fetching performance overview data from Convex
 * @returns Performance data or undefined if not yet loaded
 */
export function usePerformanceData(): PerformanceData | undefined {
  const raw = useConvexQuery<PerformanceData | null>('performance:getPerformanceOverview', {}, true)
  if (raw === undefined) return undefined
  return raw ?? undefined
}
