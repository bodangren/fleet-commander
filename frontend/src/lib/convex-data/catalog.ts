import { getSliceConfig } from '../dataAdapter'
import {
  useConvexQuery,
  convexProjectToSummary,
  convexAgentToRecord,
  convexHarnessToRecord,
} from './core'
import type { AgentRecord, HarnessRecord, ProjectSummary } from '../fleetTypes'

/**
 * Returns transformed Convex projects as ProjectSummary[].
 * Returns undefined when Convex is not configured or still loading.
 * @param onError - Optional callback for query or connection failures
 * @param refreshKey - Changes when the caller requests a fresh subscription
 */
export function useConvexProjectsTransformed(
  onError?: (error: unknown) => void,
  refreshKey = 0,
): ProjectSummary[] | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex'
  const raw = useConvexQuery<
    Array<{
      _id: string
      slug: string
      name: string
      description: string
      path?: string
      createdAt: number
      updatedAt: number
    }>
  >('projects:listProjectsHandler', {}, enabled, onError, refreshKey)
  if (raw === undefined) return undefined
  return raw.map(convexProjectToSummary)
}

/**
 * Returns transformed Convex agents as AgentRecord[].
 * Returns undefined when Convex is not configured or still loading.
 * @param onError - Optional callback for query or connection failures
 * @param refreshKey - Changes when the caller requests a fresh subscription
 */
export function useConvexAgentsTransformed(
  onError?: (error: unknown) => void,
  refreshKey = 0,
): AgentRecord[] | undefined {
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
  >('fleetCatalog:listAgents', {}, enabled, onError, refreshKey)
  if (raw === undefined) return undefined
  return raw.map(convexAgentToRecord)
}

/**
 * Returns transformed Convex harnesses as HarnessRecord[].
 * Returns undefined when Convex is not configured or still loading.
 * @param onError - Optional callback for query or connection failures
 * @param refreshKey - Changes when the caller requests a fresh subscription
 */
export function useConvexHarnessesTransformed(
  onError?: (error: unknown) => void,
  refreshKey = 0,
): HarnessRecord[] | undefined {
  const config = getSliceConfig()
  const enabled = config.harnesses === 'convex'
  const raw = useConvexQuery<
    Array<{
      name: string
      commandTemplate: string
      discoveryCommand?: string
    }>
  >('fleetCatalog:listHarnesses', {}, enabled, onError, refreshKey)
  if (raw === undefined) return undefined
  return raw.map(convexHarnessToRecord)
}

/**
 * Returns tasks for a project from Convex.
 * Returns undefined when Convex is not configured or still loading.
 */
export function useConvexTasks(projectSlug: string | undefined) {
  const config = getSliceConfig()
  const enabled = config.tasks === 'convex' && Boolean(projectSlug)
  return useConvexQuery(
    'fleetCatalog:listTasksByProject',
    { projectSlug: projectSlug ?? '' },
    enabled,
  )
}

/**
 * Returns issues for a project from Convex.
 * Returns undefined when Convex is not configured or still loading.
 */
export function useConvexIssues(projectSlug: string | undefined) {
  const config = getSliceConfig()
  const enabled = config.issues === 'convex' && Boolean(projectSlug)
  return useConvexQuery('issues:listIssuesByProject', { projectSlug: projectSlug ?? '' }, enabled)
}

/**
 * Returns execution logs for a project from Convex.
 * Returns undefined when Convex is not configured or still loading.
 */
export function useConvexLogs(projectSlug: string | undefined) {
  const config = getSliceConfig()
  const enabled = config.logs === 'convex' && Boolean(projectSlug)
  return useConvexQuery(
    'executionLogs:listLogsByProject',
    { projectSlug: projectSlug ?? '' },
    enabled,
  )
}
