import { useConvexQuery } from '@/lib/useConvexData'
import type { CostData } from '@/__fixtures__/insightsFixtures'

export function useCostData(): CostData | undefined {
  const raw = useConvexQuery<CostData>('insights:getCostOverview', {})
  if (raw === undefined) return undefined
  return raw
}
