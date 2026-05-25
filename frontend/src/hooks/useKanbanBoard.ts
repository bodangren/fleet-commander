import { useConvexQuery } from '@/lib/useConvexData'
import type { Sprint, SprintBoard } from './types'

export type { KanbanTask, Sprint, BoardAgent, SprintBoard } from './types'

export function useSprintBoard(sprintId?: string) {
  const enabled = Boolean(sprintId)
  const data = useConvexQuery<SprintBoard>(
    'kanban:getSprintBoardHandler',
    enabled ? { sprintId: sprintId! } : {},
    enabled,
  )

  if (!enabled) return { board: null, loading: false, error: null, refresh: () => {} }
  if (data === undefined) return { board: null, loading: true, error: null, refresh: () => {} }
  return { board: data, loading: false, error: null, refresh: () => {} }
}

export function useProjectSprints(projectId?: string) {
  const enabled = Boolean(projectId)
  const data = useConvexQuery<Sprint[]>(
    'kanban:getSprintsByProjectHandler',
    enabled ? { projectId: projectId! } : {},
    enabled,
  )

  if (!enabled) return { sprints: [] as Sprint[], loading: false, error: null }
  if (data === undefined) return { sprints: [] as Sprint[], loading: true, error: null }
  return { sprints: data, loading: false, error: null }
}

export function useActiveSprint(projectId?: string) {
  const enabled = Boolean(projectId)
  const data = useConvexQuery<Sprint | null>(
    'kanban:getActiveSprintHandler',
    enabled ? { projectId: projectId! } : {},
    enabled,
  )

  if (!enabled) return { activeSprint: null, loading: false }
  if (data === undefined) return { activeSprint: null, loading: true }
  return { activeSprint: data, loading: false }
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
