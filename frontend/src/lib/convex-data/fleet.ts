import { getSliceConfig } from '../dataAdapter'
import { useConvexQuery } from './core'

export interface DispatchPolicyStatEntry {
  persona: string
  taskKind: string
  repoType: string
  meanDurationMs?: number
  p50Cost: number
  p90Cost: number
  reviewFailRate: number
  retryRate: number
  blockerCreationRate: number
  coverageRegressionRate: number
  sampleCount: number
  windowDays: number
  insufficientData: boolean
  lastUpdatedAt: number
}

export interface HarnessReliabilityStatEntry {
  harnessName: string
  successRate7d: number
  medianLatencyMs: number
  averageTokens: number
  reviewPassRateByTaskClassJson: string
  topFailureModesJson: string
  lastUpdatedAt: number
}

/**
 * Returns fleet health data (dispatch stats + harness reliability).
 * Returns a default empty object when Convex is not configured.
 */
export function useFleetHealth():
  | {
      dispatchStats: DispatchPolicyStatEntry[]
      harnessStats: HarnessReliabilityStatEntry[]
    }
  | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex'
  const dispatchRaw = useConvexQuery<DispatchPolicyStatEntry[]>(
    'dispatchPolicyStats:listDispatchPolicyStats',
    {},
    enabled,
  )
  const harnessRaw = useConvexQuery<HarnessReliabilityStatEntry[]>(
    'harnessReliabilityStats:listHarnessReliabilityStats',
    {},
    enabled,
  )
  if (dispatchRaw === undefined && harnessRaw === undefined && !enabled) {
    return { dispatchStats: [], harnessStats: [] }
  }
  if (dispatchRaw === undefined || harnessRaw === undefined) return undefined
  return {
    dispatchStats: dispatchRaw ?? [],
    harnessStats: harnessRaw ?? [],
  }
}

/**
 * Returns queue health metrics (ready, in-progress, blocked counts, starvation, hotspots, blockers).
 * Returns a default empty object when Convex is not configured.
 */
export function useQueueHealth() {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex'
  const result = useConvexQuery<{
    readyCount: number
    inProgressCount: number
    blockedCount: number
    doneCount: number
    starvationTasks: Array<{
      taskKey: string
      title: string
      status: string
      daysIdle: number
    }>
    retryHotspots: Array<{
      taskKey: string
      title: string
      retryCount: number
    }>
    openBlockers: Array<{
      issueId: string
      title: string
      daysOpen: number
    }>
  }>('queueHealth:getQueueHealth', {}, enabled)
  if (result === undefined && !enabled) {
    return {
      readyCount: 0,
      inProgressCount: 0,
      blockedCount: 0,
      doneCount: 0,
      starvationTasks: [],
      retryHotspots: [],
      openBlockers: [],
    }
  }
  return result
}

export interface DispatchTimelineEntry {
  taskId: string
  projectSlug: string
  objective: string
  createdAt: number
  hasArchitect: boolean
  hasExecutor: boolean
  hasReviewer: boolean
  hasRecovery: boolean
  rejectionCount: number
}

/**
 * Returns recent dispatch timeline entries.
 * Returns an empty array when Convex is not configured.
 */
export function useDispatchTimeline(): DispatchTimelineEntry[] | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex'
  const raw = useConvexQuery<
    Array<{
      taskId: string
      projectSlug: string
      objective: string
      createdAt: number
      architectOutput?: string
      executorBranch?: string
      reviewerStatus?: string
      recoveryAction?: string
      dispatchRejections?: Array<{ taskKey: string; filter: string; reason: string }>
    }>
  >('runContracts:listRecentRunContracts', { limit: 50 }, enabled)
  if (raw === undefined && !enabled) return []
  if (raw === undefined) return undefined
  return raw.map(entry => ({
    taskId: entry.taskId,
    projectSlug: entry.projectSlug,
    objective: entry.objective,
    createdAt: entry.createdAt,
    hasArchitect: Boolean(entry.architectOutput),
    hasExecutor: Boolean(entry.executorBranch),
    hasReviewer: Boolean(entry.reviewerStatus),
    hasRecovery: Boolean(entry.recoveryAction),
    rejectionCount: entry.dispatchRejections?.length ?? 0,
  }))
}

export interface GovernanceEventEntry {
  scope: string
  eventType: string
  payloadJson: string
  createdAt: number
}

/**
 * Returns governance events with optional filtering.
 * Returns an empty array when Convex is not configured.
 */
export function useGovernanceEvents(
  scope?: string,
  eventType?: string,
  limit: number = 100,
): GovernanceEventEntry[] | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex'
  const raw = useConvexQuery<
    Array<{
      scope: string
      eventType: string
      payloadJson: string
      createdAt: number
    }>
  >('budgets:getGovernanceEvents', { scope, eventType, limit }, enabled)
  if (raw === undefined && !enabled) return []
  if (raw === undefined) return undefined
  return raw
}
