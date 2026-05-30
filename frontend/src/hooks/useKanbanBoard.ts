import { useConvexQuery } from '@/lib/useConvexData'
import type { Sprint, SprintBoard } from './types'

export type { KanbanTask, Sprint, BoardAgent, SprintBoard } from './types'

/**
 * Hook for fetching sprint board data from Convex
 * @param sprintId - Optional sprint ID to fetch board for
 * @returns Sprint board data with loading and error states
 */
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

/**
 * Hook returning all sprints for a project
 * @param projectId - Optional project ID to fetch sprints for
 * @returns List of sprints with loading and error states
 */
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

/**
 * Hook returning active sprint for a project
 * @param projectId - Optional project ID to find active sprint for
 * @returns Active sprint with loading state
 */
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

/**
 * Updates task status via API call
 * @param taskId - ID of the task to update
 * @param status - New status for the task
 * @returns Result with ok flag and optional error message
 */
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

/**
 * Updates sprint status via API call
 * @param sprintId - ID of the sprint to update
 * @param status - New status for the sprint
 * @returns Result with ok flag and optional error message
 */
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

/**
 * Closes a sprint via API call
 * @param sprintId - ID of the sprint to close
 * @returns Result with ok flag and optional error message
 */
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

export async function unblockTask(taskId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/board/tasks/${taskId}/unblock`, {
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
