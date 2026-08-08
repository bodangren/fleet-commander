import { useCallback, useEffect, useState } from 'react'
import { useConvexQuery } from '@/lib/useConvexData'

export interface TaskRecommendation {
  taskId: string
  taskTitle: string
  storyPoints: number
  priority: string
  assignedAgentId?: string
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

export interface CriticalPath {
  totalStoryPoints: number
  path: string[]
}

export interface ExternalIncompleteDep {
  taskId: string
  taskTitle: string
  missingDeps: Array<{ taskKey: string; title: string; status: string }>
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
  criticalPath?: CriticalPath | null
  externalIncompleteDeps?: ExternalIncompleteDep[]
  makespan?: number
}

export interface ProjectStats {
  backlogCount: number
  totalPoints: number
  activeSprintCount: number
}

/**
 * Fetches sprint planning recommendation from API
 * @param projectId - Project ID to get recommendation for
 * @returns Recommendation data with loading and error states
 */
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

/**
 * Gets project stats via Convex query
 * @param projectId - Project ID to get stats for
 * @returns Project stats with loading and error states
 */
export function useProjectStats(projectId?: string) {
  const enabled = Boolean(projectId)
  const data = useConvexQuery<ProjectStats>(
    'sprintPlanning:getProjectStatsHandler',
    enabled ? { projectId: projectId! } : {},
    enabled,
  )

  if (!enabled) return { stats: null, loading: false, error: null }
  if (data === undefined) return { stats: null, loading: true, error: null }
  return { stats: data, loading: false, error: null }
}

/**
 * Creates a new sprint via API POST
 * @param payload - Sprint creation payload with projectId, name, budget, and taskAssignments
 * @returns Result with ok flag, sprintId, or error message
 */
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
