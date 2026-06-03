import { getSliceConfig } from '../dataAdapter'
import { useConvexQuery } from './core'
import type {
  SprintHistoryItem,
  AgentHistoryItem,
  TaskHistoryItem,
} from '../../__fixtures__/historyFixtures'

/**
 * Returns sprint history for a project.
 * Returns undefined when Convex is not configured or still loading.
 */
export function useSprintHistoryQuery(args: {
  projectId: string
  limit?: number
}): SprintHistoryItem[] | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex' && Boolean(args.projectId)
  const raw = useConvexQuery<
    Array<{
      _id: string
      name: string
      status: string
      budget: number
      actualCost: number
      pointsDelivered: number
      pointsEstimated: number
      taskCount: number
      completedCount: number
      velocity: number
      createdAt: number
      projectId: string
    }>
  >('history:listSprintHistory', { projectId: args.projectId, limit: args.limit }, enabled)
  if (raw === undefined) return undefined
  return raw.map(item => ({
    ...item,
    status: item.status as 'planned' | 'active' | 'closed',
    startDate: item.createdAt,
    endDate: item.createdAt,
  }))
}

/**
 * Returns agent history with optional project filtering.
 * Returns undefined when Convex is not configured or still loading.
 */
export function useAgentHistoryQuery(args: {
  projectId?: string
  limit?: number
}): AgentHistoryItem[] | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex'
  const raw = useConvexQuery<
    Array<{
      _id: string
      name: string
      displayName: string
      model: string
      tasksCompleted: number
      totalCost: number
      avgLatencyMs: number
      reliability: number
      periodStart: number
      periodEnd: number
    }>
  >('history:listAgentHistory', { projectId: args.projectId, limit: args.limit }, enabled)
  if (raw === undefined) return undefined
  return raw
}

/**
 * Returns task history with optional status and search filtering.
 * Returns undefined when Convex is not configured or still loading.
 */
export function useTaskHistoryQuery(args: {
  projectId: string
  status?: string
  search?: string
  limit?: number
}): TaskHistoryItem[] | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex' && Boolean(args.projectId)
  const raw = useConvexQuery<
    Array<{
      _id: string
      title: string
      status: string
      agent?: string
      projectSlug: string
      sprintId?: string
      cost: number
      storyPoints: number
      createdAt: number
      completedAt?: number
    }>
  >(
    'history:listTaskHistory',
    { projectId: args.projectId, status: args.status, search: args.search, limit: args.limit },
    enabled,
  )
  if (raw === undefined) return undefined
  return raw.map(item => ({
    ...item,
    agent: item.agent ?? 'unassigned',
    sprintId: item.sprintId ?? '',
  }))
}
