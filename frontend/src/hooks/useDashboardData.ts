import { useState, useEffect, useCallback } from 'react'

export interface DashboardSprint {
  _id: string
  name: string
  status: string
  budget: number
  actualCost: number
  pointsDelivered: number
  taskCount: number
  completedCount: number
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

export function useDashboardData(projectId?: string) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = projectId
        ? `/api/dashboard?projectId=${encodeURIComponent(projectId)}`
        : '/api/dashboard'
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const json = await res.json()
      if (json.error) {
        throw new Error(json.error)
      }
      setData(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refresh }
}
