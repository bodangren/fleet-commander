import { useEffect, useState } from 'react'
import { getSliceConfig } from '../dataAdapter'
import { useConvexQuery } from './core'
import type {
  SprintHistoryItem,
  AgentHistoryItem,
  TaskHistoryItem,
} from '../../__fixtures__/historyFixtures'

const HISTORY_AGENTS_API = 'history/agents:listAgentHistoryHandler'
const HISTORY_SPRINTS_API = 'history/sprints:listSprintHistoryHandler'
const HISTORY_TASKS_API = 'history/tasks:listTaskHistoryHandler'
const HISTORY_REQUEST_TIMEOUT_MS = 15_000

type SprintHistoryRecord = {
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
  startedAt?: number
  closedAt?: number
  projectId: string
}

type TaskHistoryRecord = {
  _id: string
  projectId: string
  description: string
  priority: string
  title: string
  status: string
  agent?: string
  projectSlug?: string
  trackId?: string
  taskKey?: string
  dependencies?: string[]
  sprintId?: string
  costEstimate: number
  actualCost?: number
  storyPoints: number
  createdAt: number
  updatedAt: number
}

function buildHistoryUrl(
  kind: 'sprints' | 'tasks',
  projectId: string,
  params: { limit?: number; status?: string; search?: string },
): string {
  const query = new URLSearchParams()
  if (params.limit !== undefined) query.set('limit', String(params.limit))
  if (params.status) query.set('status', params.status)
  if (params.search) query.set('search', params.search)

  const base = `/api/history/projects/${encodeURIComponent(projectId)}/${kind}`
  const queryString = query.toString()
  return queryString ? `${base}?${queryString}` : base
}

async function readHistoryResponse<T>(response: Response): Promise<T> {
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    payload = undefined
  }

  if (!response.ok) {
    const details =
      payload && typeof payload === 'object' && 'error' in payload
        ? String(payload.error)
        : `History request failed (${response.status})`
    throw new Error(details)
  }
  if (!Array.isArray(payload)) {
    throw new Error('History response did not include an array')
  }
  return payload as T
}

function usePivotHistoryQuery<T>(url: string, enabled: boolean): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const controller = new AbortController()

    setData(undefined)

    if (!enabled) return () => controller.abort()

    const request = (async () => {
      const response = await fetch(url, { signal: controller.signal })
      return readHistoryResponse<T>(response)
    })()
    const timeout = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort()
        reject(new Error('History request timed out. Please try again.'))
      }, HISTORY_REQUEST_TIMEOUT_MS)
    })

    void Promise.race([request, timeout]).then(
      nextData => {
        if (timeoutId !== undefined) clearTimeout(timeoutId)
        if (cancelled || controller.signal.aborted) return
        setData(nextData)
      },
      () => {
        if (timeoutId !== undefined) clearTimeout(timeoutId)
      },
    )

    return () => {
      cancelled = true
      controller.abort()
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [enabled, url])

  return data
}

function mapSprintHistory(raw: SprintHistoryRecord[] | undefined): SprintHistoryItem[] | undefined {
  if (raw === undefined) return undefined
  return raw.map(item => ({
    ...item,
    status: item.status as 'planned' | 'active' | 'closed',
    startDate: item.startedAt ?? item.createdAt,
    endDate: item.closedAt ?? item.startedAt ?? item.createdAt,
  }))
}

function mapTaskHistory(raw: TaskHistoryRecord[] | undefined): TaskHistoryItem[] | undefined {
  if (raw === undefined) return undefined
  return raw.map(item => ({
    _id: item._id,
    title: item.title,
    status: item.status,
    agent: item.agent ?? 'unassigned',
    projectSlug: item.projectSlug ?? '',
    sprintId: item.sprintId ?? '',
    cost: item.actualCost ?? item.costEstimate,
    storyPoints: item.storyPoints,
    createdAt: item.createdAt,
    completedAt: item.status === 'done' ? item.updatedAt : undefined,
  }))
}

/**
 * Returns sprint history for a project from the configured Convex or Pivot source.
 * @param args - Project identifier and optional result limit
 * @returns History rows, or undefined while loading or when the source is unavailable
 */
export function useSprintHistoryQuery(args: {
  projectId: string
  limit?: number
}): SprintHistoryItem[] | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex' && Boolean(args.projectId)
  const raw = useConvexQuery<SprintHistoryRecord[]>(
    HISTORY_SPRINTS_API,
    { projectId: args.projectId, limit: args.limit },
    enabled,
  )
  const pivotData = usePivotHistoryQuery<SprintHistoryRecord[]>(
    buildHistoryUrl('sprints', args.projectId, { limit: args.limit }),
    config.projects === 'bun' && Boolean(args.projectId),
  )
  return mapSprintHistory(config.projects === 'bun' ? pivotData : raw)
}

/**
 * Returns agent history with optional project filtering.
 * @param args - Optional project identifier and result limit
 * @returns Agent history rows, or undefined while loading or unavailable
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
  >(HISTORY_AGENTS_API, { projectId: args.projectId, limit: args.limit }, enabled)
  if (raw === undefined) return undefined
  return raw
}

/**
 * Returns task history with optional status and search filtering from the configured source.
 * @param args - Project identifier, filters, and optional result limit
 * @returns History rows, or undefined while loading or when the source is unavailable
 */
export function useTaskHistoryQuery(args: {
  projectId: string
  status?: string
  search?: string
  limit?: number
}): TaskHistoryItem[] | undefined {
  const config = getSliceConfig()
  const enabled = config.projects === 'convex' && Boolean(args.projectId)
  const raw = useConvexQuery<TaskHistoryRecord[]>(
    HISTORY_TASKS_API,
    { projectId: args.projectId, status: args.status, search: args.search, limit: args.limit },
    enabled,
  )
  const pivotData = usePivotHistoryQuery<TaskHistoryRecord[]>(
    buildHistoryUrl('tasks', args.projectId, {
      status: args.status,
      search: args.search,
      limit: args.limit,
    }),
    config.projects === 'bun' && Boolean(args.projectId),
  )
  return mapTaskHistory(config.projects === 'bun' ? pivotData : raw)
}
