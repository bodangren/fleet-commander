import { useEffect, useState } from 'react'

import type { AgentRecord, HarnessRecord, ProjectSummary } from './fleetTypes'

import { getSliceConfig } from './dataAdapter'

export interface CoverageDisplay {
  projectSlug: string
  projectId: string
  percentage: number
  tool: string
  executionId: string | undefined
  date: Date
}

export function convexCoverageRecordToDisplay(record: {
  projectSlug: string
  projectId: string
  percentage: number
  tool: string
  executionId?: string
  createdAt: number
}): CoverageDisplay {
  return {
    projectSlug: record.projectSlug,
    projectId: record.projectId,
    percentage: record.percentage,
    tool: record.tool,
    executionId: record.executionId,
    date: new Date(record.createdAt),
  }
}

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined

export function parseToolsJson(toolsJson: string): Record<string, boolean> {
  try {
    return JSON.parse(toolsJson) as Record<string, boolean>
  } catch {
    return {}
  }
}

export function convexProjectToSummary(project: {
  slug: string
  name: string
  rootPath: string
  status: string
  updatedAt: number
}): ProjectSummary {
  return {
    id: project.slug,
    name: project.name,
    path: project.rootPath,
    tracks: [],
    lastUpdated: project.updatedAt,
  }
}

export function convexAgentToRecord(agent: {
  name: string
  displayName: string
  mode: string
  model: string
  temperature: number
  prompt: string
  toolsJson: string
}): AgentRecord {
  return {
    layer: 'convex',
    definition: {
      name: agent.name,
      description: agent.displayName,
      mode: agent.mode,
      model: agent.model,
      temperature: agent.temperature,
      tools: parseToolsJson(agent.toolsJson),
      body: agent.prompt,
    },
  }
}

export function convexHarnessToRecord(harness: {
  name: string
  commandTemplate: string
  discoveryCommand?: string
}): HarnessRecord {
  return {
    layer: 'convex',
    binaryFound: true,
    definition: {
      name: harness.name,
      binary: '',
      discovery: {
        command: harness.discoveryCommand ?? '',
        parseStrategy: 'lines',
        pattern: '',
      },
      invocation: {
        template: harness.commandTemplate,
        flags: {},
      },
    },
  }
}

/**
 * Subscribe to a Convex query imperatively (no React provider required).
 * Returns undefined when Convex is not configured or client unavailable.
 */
function useConvexQuery<T>(
  queryName: string,
  args: Record<string, unknown>,
  enabled: boolean,
): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined)

  useEffect(() => {
    if (!enabled || !convexUrl) {
      setData(undefined)
      return
    }

    let cancelled = false
    let unsubscribe: (() => void) | undefined

    import('convex/browser')
      .then(({ ConvexClient }) => {
        if (cancelled) return
        const client = new ConvexClient(convexUrl)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        unsubscribe = (client as any).onUpdate(queryName, args, (result: T) => {
          if (!cancelled) {
            setData(result)
          }
        }) as () => void
      })
      .catch(() => {
        // Convex not available
      })

    return () => {
      cancelled = true
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [queryName, JSON.stringify(args), enabled])

  return data
}

export function useConvexProjectsTransformed(): ProjectSummary[] | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex'
  const raw = useConvexQuery<
    Array<{
      slug: string
      name: string
      rootPath: string
      status: string
      updatedAt: number
    }>
  >('projects:listProjects', {}, enabled)
  if (raw === undefined) return undefined
  return raw.map(convexProjectToSummary)
}

export function useConvexAgentsTransformed(): AgentRecord[] | undefined {
  const config = getSliceConfig()
  const enabled = config.agents === 'convex'
  const raw = useConvexQuery<
    Array<{
      name: string
      displayName: string
      mode: string
      model: string
      temperature: number
      prompt: string
      toolsJson: string
    }>
  >('fleetCatalog:listAgents', {}, enabled)
  if (raw === undefined) return undefined
  return raw.map(convexAgentToRecord)
}

export function useConvexHarnessesTransformed(): HarnessRecord[] | undefined {
  const config = getSliceConfig()
  const enabled = config.harnesses === 'convex'
  const raw = useConvexQuery<
    Array<{
      name: string
      commandTemplate: string
      discoveryCommand?: string
    }>
  >('fleetCatalog:listHarnesses', {}, enabled)
  if (raw === undefined) return undefined
  return raw.map(convexHarnessToRecord)
}

export function useConvexTasks(projectSlug: string | undefined) {
  const config = getSliceConfig()
  const enabled = config.tasks === 'convex' && Boolean(projectSlug)
  return useConvexQuery(
    'fleetCatalog:listTasksByProject',
    { projectSlug: projectSlug ?? '' },
    enabled,
  )
}

export function useConvexIssues(projectSlug: string | undefined) {
  const config = getSliceConfig()
  const enabled = config.issues === 'convex' && Boolean(projectSlug)
  return useConvexQuery('issues:listIssuesByProject', { projectSlug: projectSlug ?? '' }, enabled)
}

export function useConvexLogs(projectSlug: string | undefined) {
  const config = getSliceConfig()
  const enabled = config.logs === 'convex' && Boolean(projectSlug)
  return useConvexQuery(
    'executionLogs:listLogsByProject',
    { projectSlug: projectSlug ?? '' },
    enabled,
  )
}

export function useCoverageHistory(projectSlug: string | undefined, limit?: number) {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex' && Boolean(projectSlug)
  const raw = useConvexQuery<
    Array<{
      projectSlug: string
      projectId: string
      percentage: number
      tool: string
      executionId?: string
      createdAt: number
    }>
  >('coverageRecords:getCoverageHistory', { projectSlug: projectSlug ?? '', limit }, enabled)
  if (raw === undefined) return undefined
  return raw.map(convexCoverageRecordToDisplay)
}

export function useLatestCoverage(projectSlug: string | undefined) {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex' && Boolean(projectSlug)
  const raw = useConvexQuery<{
    projectSlug: string
    projectId: string
    percentage: number
    tool: string
    executionId?: string
    createdAt: number
  } | null>('coverageRecords:getLatestCoverage', { projectSlug: projectSlug ?? '' }, enabled)
  if (raw === undefined) return undefined
  return raw ? convexCoverageRecordToDisplay(raw) : null
}

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

export interface DispatchPolicyStatEntry {
  persona: string
  taskKind: string
  repoType: string
  meanDurationMs: number
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
  >('governanceEvents:getGovernanceEvents', { scope, eventType, limit }, enabled)
  if (raw === undefined && !enabled) return []
  if (raw === undefined) return undefined
  return raw
}

export interface ReconciliationEventEntry {
  projectSlug: string
  artifactType: string
  artifactId: string
  divergenceType: string
  conductorHash: string
  canonicalHash: string
  description: string
  counter: number
  createdAt: number
}

export function useReconciliationEvents(
  limit: number = 50,
): ReconciliationEventEntry[] | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex'
  const raw = useConvexQuery<
    Array<{
      projectSlug: string
      artifactType: string
      artifactId: string
      divergenceType: string
      conductorHash: string
      canonicalHash: string
      description: string
      counter: number
      createdAt: number
    }>
  >('reconciliationEvents:listRecent', { limit }, enabled)
  if (raw === undefined && !enabled) return []
  if (raw === undefined) return undefined
  return raw
}

export interface PolicyWeightsEntry {
  name: string
  weightsJson: string
  version: number
  createdAt: number
}

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

export interface ReconciliationProposalEntry {
  _id: string
  projectSlug: string
  artifactType: string
  artifactId: string
  patchJson: string
  sourceSide: string
  reason: string
  status: string
  createdAt: number
}

export function useReconciliationProposals(
  projectSlug?: string,
  limit: number = 50,
): ReconciliationProposalEntry[] | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex'
  const queryName = projectSlug
    ? 'reconciliationProposals:listPendingProposals'
    : 'reconciliationProposals:listPendingProposals'
  const args = projectSlug ? { projectSlug, limit } : { projectSlug: '', limit }
  const raw = useConvexQuery<
    Array<{
      _id: string
      projectSlug: string
      artifactType: string
      artifactId: string
      patchJson: string
      sourceSide: string
      reason: string
      status: string
      createdAt: number
    }>
  >(queryName, args, enabled)
  if (raw === undefined && !enabled) return []
  if (raw === undefined) return undefined
  return raw
}
