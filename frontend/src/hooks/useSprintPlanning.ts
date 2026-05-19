import { useCallback, useEffect, useState } from 'react'

export interface TaskRecommendation {
  taskId: string
  taskTitle: string
  storyPoints: number
  priority: string
  assignedAgentId: string
  assignedAgentName: string
  agentRole: string
  costPerPoint: number
  estimatedCost: number
  selected: boolean
}

export interface AgentBreakdown {
  agentId: string
  agentName: string
  role: string
  totalPoints: number
  costPerPoint: number
  totalCost: number
  taskCount: number
}

export interface SprintRecommendation {
  tasks: TaskRecommendation[]
  agentBreakdown: AgentBreakdown[]
  totalPoints: number
  totalCost: number
  taskCount: number
  avgCostPerPoint: number
  recommendedBudget: number
  bufferPercent: number
}

export interface ProjectStats {
  backlogCount: number
  totalPoints: number
  activeSprintCount: number
}

export function useSprintPlanningRecommendation(projectId?: string) {
  const [recommendation, setRecommendation] = useState<SprintRecommendation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/planning/recommendation?projectId=${projectId}`)
      if (!res.ok) throw new Error(`Failed to fetch recommendation: ${res.status}`)
      const data = (await res.json()) as SprintRecommendation
      setRecommendation(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { recommendation, loading, error, refresh }
}

export function useProjectStats(projectId?: string) {
  const [stats, setStats] = useState<ProjectStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/planning/projects/${projectId}/stats`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`)
        return res.json() as Promise<ProjectStats>
      })
      .then(data => {
        if (!cancelled) {
          setStats(data)
          setLoading(false)
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unknown error')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  return { stats, loading, error }
}

export async function createSprint(payload: {
  projectId: string
  name: string
  budget: number
  taskAssignments: Array<{ taskId: string; agentId: string }>
}): Promise<{ ok: boolean; sprintId?: string; error?: string }> {
  try {
    const res = await fetch('/api/planning/sprints', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = (await res.json()) as { ok: boolean; sprintId: string; error?: string }
    if (!res.ok) {
      return { ok: false, error: data.error || `HTTP ${res.status}` }
    }
    return { ok: true, sprintId: data.sprintId }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
