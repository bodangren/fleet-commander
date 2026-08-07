import { useCallback, useEffect, useState } from 'react'

import { useConvexQuery } from '@/lib/useConvexData'
import type { QualityStageAttemptView } from '@/components/timeline/QualityStageRow'

export interface PipelineRun {
  _id: string
  taskId: string
  stage: string
  agentId?: string
  startTime: number
  endTime?: number
  cost?: number
  status: string
  createdAt: number
}

export interface TimelineAgent {
  _id: string
  name: string
  role: string
  skills: string[]
  model: string
  costPerPoint: number
  reliability: number
  status: string
  workload: number
  maxWorkload: number
  createdAt: number
}

export interface TimelineSprint {
  _id: string
  projectId: string
  name: string
  status: string
  budget: number
  actualCost: number
  pointsDelivered: number
  taskCount: number
  completedCount: number
  createdAt: number
  startedAt?: number
  closedAt?: number
}

export interface TimelineProject {
  _id: string
  name: string
  description: string
  createdAt: number
  updatedAt: number
}

export interface TimelineTask {
  _id: string
  projectId: string
  sprintId?: string
  title: string
  description: string
  storyPoints: number
  status: string
  priority: string
  costEstimate: number
  actualCost?: number
  assigneeId?: string
  reviewerId?: string
  mergerId?: string
  createdAt: number
  updatedAt: number
}

export interface TaskTimelineData {
  task: TimelineTask | null
  pipelineRuns: PipelineRun[]
  agents: TimelineAgent[]
  sprint: TimelineSprint | null
  project: TimelineProject | null
  /** Optional quality stage attempts for the task (S4 visibility). */
  qualityStages?: QualityStageAttemptView[]
}

export interface UseTaskTimelineReturn {
  data: TaskTimelineData | null
  loading: boolean
  error: string | null
  refresh: () => void
}

function hasConvexUrl(): boolean {
  return Boolean(import.meta.env.VITE_CONVEX_URL)
}

/**
 * Fetches task timeline data from Convex when configured, otherwise from the
 * Bun REST endpoint `GET /api/tasks/:taskId/timeline` (used by Playwright mocks).
 */
export function useTaskTimeline(taskId: string | undefined): UseTaskTimelineReturn {
  const enabled = Boolean(taskId && taskId.trim() !== '')
  // Vitest unit tests mock useConvexQuery and expect it enabled; e2e clears VITE_CONVEX_URL.
  const preferConvex = hasConvexUrl() || import.meta.env.MODE === 'test'

  const convexData = useConvexQuery<TaskTimelineData>(
    'taskTimeline:getTaskTimelineHandler',
    enabled && preferConvex ? { taskId: taskId! } : {},
    enabled && preferConvex,
  )

  const [restData, setRestData] = useState<TaskTimelineData | null>(null)
  const [restLoading, setRestLoading] = useState(false)
  const [restError, setRestError] = useState<string | null>(null)
  const [restTick, setRestTick] = useState(0)

  const loadRest = useCallback(async () => {
    if (!enabled || !taskId || preferConvex) return
    setRestLoading(true)
    setRestError(null)
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/timeline`)
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Failed to load timeline (${res.status})`)
      }
      const body = (await res.json()) as { data?: TaskTimelineData } | TaskTimelineData
      const payload = 'data' in body && body.data ? body.data : (body as TaskTimelineData)
      setRestData(payload)
    } catch (e) {
      setRestError(e instanceof Error ? e.message : 'Failed to load timeline')
      setRestData(null)
    } finally {
      setRestLoading(false)
    }
  }, [enabled, taskId, preferConvex, restTick])

  useEffect(() => {
    void loadRest()
  }, [loadRest])

  if (!enabled) {
    return { data: null, loading: false, error: null, refresh: () => {} }
  }

  if (preferConvex) {
    if (convexData === undefined) {
      return { data: null, loading: true, error: null, refresh: () => {} }
    }
    return { data: convexData, loading: false, error: null, refresh: () => {} }
  }

  return {
    data: restData,
    loading: restLoading,
    error: restError,
    refresh: () => setRestTick(t => t + 1),
  }
}
