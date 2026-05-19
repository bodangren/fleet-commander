import { useCallback, useEffect, useState } from 'react'

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
}

export interface UseTaskTimelineReturn {
  data: TaskTimelineData | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useTaskTimeline(taskId: string | undefined): UseTaskTimelineReturn {
  const [data, setData] = useState<TaskTimelineData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTimeline = useCallback(async () => {
    if (!taskId || taskId.trim() === '') {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/timeline`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const json = await res.json()
      setData(json.data ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    fetchTimeline()
  }, [fetchTimeline])

  return {
    data,
    loading,
    error,
    refresh: fetchTimeline,
  }
}
