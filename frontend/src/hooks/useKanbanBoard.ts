import { useCallback, useEffect, useState } from 'react'

export type KanbanTask = {
  _id: string
  projectId: string
  sprintId?: string
  title: string
  description: string
  storyPoints: number
  status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked'
  priority: 'low' | 'medium' | 'high'
  costEstimate: number
  actualCost?: number
  assigneeId?: string
  reviewerId?: string
  mergerId?: string
  assigneeName?: string
  assigneeRole?: string
  createdAt: number
  updatedAt: number
}

export type Sprint = {
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

export type BoardAgent = {
  _id: string
  name: string
  role: string
  status: string
}

export type SprintBoard = {
  sprint: Sprint
  tasks: KanbanTask[]
  agents: BoardAgent[]
}

export function useSprintBoard(sprintId?: string) {
  const [board, setBoard] = useState<SprintBoard | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!sprintId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/board/sprints/${sprintId}`)
      if (!res.ok) throw new Error(`Failed to fetch board: ${res.status}`)
      const json = (await res.json()) as { data: SprintBoard }
      setBoard(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [sprintId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { board, loading, error, refresh }
}

export function useProjectSprints(projectId?: string) {
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/board/projects/${projectId}/sprints`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch sprints: ${res.status}`)
        return res.json() as Promise<{ data: Sprint[] }>
      })
      .then(json => {
        if (!cancelled) {
          setSprints(json.data)
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

  return { sprints, loading, error }
}

export function useActiveSprint(projectId?: string) {
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/board/projects/${projectId}/active-sprint`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch active sprint: ${res.status}`)
        return res.json() as Promise<{ data: Sprint | null }>
      })
      .then(json => {
        if (!cancelled) {
          setActiveSprint(json.data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  return { activeSprint, loading }
}

export async function updateTaskStatus(
  taskId: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/board/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      return { ok: false, error: data.error || `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function updateSprintStatus(
  sprintId: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/board/sprints/${sprintId}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      return { ok: false, error: data.error || `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function closeSprint(sprintId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/board/sprints/${sprintId}/close`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    })
    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      return { ok: false, error: data.error || `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
