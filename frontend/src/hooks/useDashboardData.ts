import { useCallback, useEffect, useState } from 'react'

const DASHBOARD_REQUEST_TIMEOUT_MS = 15_000
const DASHBOARD_TIMEOUT_MESSAGE = 'Dashboard request timed out. Please try again.'

export interface DashboardSprint {
  _id: string
  name: string
  status: string
  budget: number
  actualCost: number
  pointsDelivered: number
  taskCount: number
  completedCount: number
  burnRate: number
  projectedExhaustionMs: number | null
  atRisk: boolean
  forecastConfidence: number
}

export interface DashboardTask {
  _id: string
  title: string
  status: string
  storyPoints: number
  actualCost?: number
  assigneeId?: string
  priority: string
}

export interface DashboardAgent {
  _id: string
  name: string
  role: string
  status: string
  workload: number
  maxWorkload: number
}

export interface DashboardPipelineRun {
  _id: string
  taskId: string
  stage: string
  agentId?: string
  startTime: number
  endTime?: number
  cost?: number
  status: string
}

export interface DashboardAlert {
  _id: string
  type: string
  severity: string
  message: string
  createdAt: number
}

export interface DashboardMetrics {
  deliveryRate: number
  successRate: number
  avgPipelineTime: number
  rejectionRate: number
}

export interface DashboardData {
  sprint: DashboardSprint | null
  tasks: DashboardTask[]
  agents: DashboardAgent[]
  pipelineRuns: DashboardPipelineRun[]
  alerts: DashboardAlert[]
  metrics: DashboardMetrics
}

export interface DashboardLoadState {
  data: DashboardData | undefined
  loading: boolean
  error: string | null
  refresh: () => void
}

/**
 * Fetches dashboard data (sprint, tasks, agents, runs, alerts, metrics) from Pivot.
 * @param projectId - Optional project identifier used to scope dashboard data
 * @returns Dashboard data state with loading, error, and refresh controls
 */
export function useDashboardData(projectId?: string): DashboardLoadState {
  const [data, setData] = useState<DashboardData>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  const refresh = useCallback(() => setRevision(value => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    let timedOut = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''
        const request = (async () => {
          const response = await fetch(`/api/dashboard${query}`, { signal: controller.signal })
          const payload = (await response.json()) as { data?: DashboardData; error?: string }
          if (!response.ok)
            throw new Error(payload.error ?? `Dashboard request failed (${response.status})`)
          if (!payload.data) throw new Error('Dashboard response did not include data')
          return payload.data
        })()
        const timeout = new Promise<DashboardData>((_, reject) => {
          timeoutId = setTimeout(() => {
            timedOut = true
            controller.abort()
            reject(new Error(DASHBOARD_TIMEOUT_MESSAGE))
          }, DASHBOARD_REQUEST_TIMEOUT_MS)
        })
        const nextData = await Promise.race([request, timeout])
        if (controller.signal.aborted && !timedOut) return
        setData(nextData)
        setLoading(false)
      } catch (requestError) {
        if (controller.signal.aborted && !timedOut) return
        setData(undefined)
        setLoading(false)
        setError(
          timedOut
            ? DASHBOARD_TIMEOUT_MESSAGE
            : requestError instanceof Error
              ? requestError.message
              : 'Unable to load dashboard',
        )
      } finally {
        if (timeoutId !== undefined) clearTimeout(timeoutId)
      }
    })()

    return () => {
      controller.abort()
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [projectId, revision])

  return { data, loading, error, refresh }
}
