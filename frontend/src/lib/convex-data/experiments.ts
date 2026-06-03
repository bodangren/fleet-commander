import { getSliceConfig } from '../dataAdapter'
import { useConvexQuery } from './core'

export interface AbTestEntry {
  _id: string
  name: string
  agentRole: string
  controlModel: string
  treatmentModel: string
  splitRatio: number
  status: string
  sprintId?: string
  createdAt: number
  completedAt?: number
}

/**
 * Returns A/B tests with optional status filtering.
 * Returns an empty array when Convex is not configured.
 */
export function useAbTests(status?: string, limit: number = 50): AbTestEntry[] | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex'
  const raw = useConvexQuery<
    Array<{
      _id: string
      name: string
      agentRole: string
      controlModel: string
      treatmentModel: string
      splitRatio: number
      status: string
      sprintId?: string
      createdAt: number
      completedAt?: number
    }>
  >('abTests:listAbTests', { status, limit }, enabled)
  if (raw === undefined && !enabled) return []
  if (raw === undefined) return undefined
  return raw
}

export interface ExperimentRunEntry {
  _id: string
  experimentId: string
  variant: 'control' | 'treatment'
  taskDescription: string
  model: string
  agentRole: string
  cost: number
  durationMs: number
  output: string
  rejected: boolean
  similarityScore?: number
  startedAt: number
  completedAt: number
}

export interface ExperimentResults {
  experiment: AbTestEntry | null
  runs: ExperimentRunEntry[]
  summary: {
    controlAvgCost: number
    treatmentAvgCost: number
    controlAvgDuration: number
    treatmentAvgDuration: number
    controlRejectionRate: number
    treatmentRejectionRate: number
    avgSimilarity: number
    controlRuns: number
    treatmentRuns: number
  }
}

/**
 * Returns experiment results for a specific experiment.
 * Returns undefined when Convex is not configured or still loading.
 */
export function useExperimentResults(
  experimentId: string | undefined,
): ExperimentResults | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex' && !!experimentId
  const raw = useConvexQuery<ExperimentResults>(
    'abTests:getExperimentResults',
    { experimentId: experimentId! },
    enabled,
  )
  if (raw === undefined && !enabled) return undefined
  return raw
}
