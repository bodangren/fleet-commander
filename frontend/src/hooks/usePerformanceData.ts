import type { PerformanceData } from '@/__fixtures__/performanceFixtures'
import { useConvexQuery } from '@/lib/useConvexData'

export function usePerformanceData(): PerformanceData | undefined {
  const raw = useConvexQuery<PerformanceData | null>('performance:getPerformanceOverview', {}, true)
  if (raw === undefined) return undefined
  return raw ?? undefined
}
