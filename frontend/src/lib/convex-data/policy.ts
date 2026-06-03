import { getSliceConfig } from '../dataAdapter'
import { useConvexQuery } from './core'

export interface PolicyWeightsEntry {
  name: string
  weightsJson: string
  version: number
  createdAt: number
}

/**
 * Returns policy weights history.
 * Returns an empty array when Convex is not configured.
 */
export function usePolicyWeights(limit: number = 50): PolicyWeightsEntry[] | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex'
  const raw = useConvexQuery<
    Array<{
      name: string
      weightsJson: string
      version: number
      createdAt: number
    }>
  >('policyWeights:listPolicyWeights', { limit }, enabled)
  if (raw === undefined && !enabled) return []
  if (raw === undefined) return undefined
  return raw
}
