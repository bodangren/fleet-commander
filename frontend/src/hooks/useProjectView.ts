import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { BoardTask } from '@/components/legacy/KanbanBoard'
import type { ProjectDetail, ScoredCandidate } from '@/lib/fleetTypes'

/**
 * Formats Unix timestamp to localized date-time string
 * @param value - Unix timestamp (seconds)
 * @returns Formatted date-time string or 'Unknown' if value is falsy
 */
function formatTimestamp(value: number) {
  if (!value) {
    return 'Unknown'
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value * 1000))
}

/**
 * Returns new project object with task status updated
 * @param project - The original project object
 * @param taskId - ID of the task to update
 * @param status - New status to set
 * @returns New project object with updated task status
 */
function updateTaskStatus(project: ProjectDetail, taskId: string, status: string) {
  return {
    ...project,
    tracks: project.tracks.map(track => ({
      ...track,
      phases: track.phases.map(phase => ({
        ...phase,
        tasks: phase.tasks.map(task => (task.id === taskId ? { ...task, status } : task)),
      })),
    })),
  }
}

type IssuePreview = {
  fileName: string
  path: string
  content: string
  matchReason: string
}

type IssueState = {
  loading: boolean
  error: string | null
  task: Pick<BoardTask, 'id' | 'description' | 'phase' | 'trackName'> | null
  issue: IssuePreview | null
}

export type UseProjectLoaderReturn = {
  project: ProjectDetail | null
  setProject: React.Dispatch<React.SetStateAction<ProjectDetail | null>>
  loading: boolean
  error: string | null
}

/**
 * Loads a project by ID from the API
 * @param id - Project ID to load
 * @returns Project data with loading and error states
 */
export function useProjectLoader(id: string | undefined): UseProjectLoaderReturn {
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setError('Project id is missing from the route.')
      setLoading(false)
      return
    }

    const controller = new AbortController()

    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
          signal: controller.signal,
        })
        const payload = (await response.json()) as ProjectDetail & { error?: string }
        if (response.status === 404) {
          navigate('/', { replace: true })
          return
        }
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to load project')
        }
        setProject(payload)
      } catch (loadError) {
        if (controller.signal.aborted) {
          return
        }
        const message = loadError instanceof Error ? loadError.message : 'Unknown error'
        setError(message)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    })()

    return () => controller.abort()
  }, [id, navigate])

  return { project, setProject, loading, error }
}

export type UseNextTaskReturn = {
  nextTask: ScoredCandidate | null
  nextTaskLoading: boolean
  nextTaskError: string | null
  fetchNextTask: () => Promise<void>
}

/**
 * Fetches the next recommended task for a project
 * @param id - Project ID to get next task for
 * @returns Next task recommendation with loading state
 */
export function useNextTask(id: string | undefined): UseNextTaskReturn {
  const [nextTask, setNextTask] = useState<ScoredCandidate | null>(null)
  const [nextTaskLoading, setNextTaskLoading] = useState(false)
  const [nextTaskError, setNextTaskError] = useState<string | null>(null)

  const fetchNextTask = useCallback(async () => {
    if (!id) {
      return
    }
    setNextTaskLoading(true)
    setNextTaskError(null)
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(id)}/next-task`)
      if (response.status === 404) {
        setNextTask(null)
        return
      }
      const payload = (await response.json()) as ScoredCandidate & { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to load next task')
      }
      setNextTask(payload)
    } catch (nextTaskLoadError) {
      setNextTask(null)
      setNextTaskError(
        nextTaskLoadError instanceof Error ? nextTaskLoadError.message : 'Failed to load next task',
      )
    } finally {
      setNextTaskLoading(false)
    }
  }, [id])

  useEffect(() => {
    void fetchNextTask()
  }, [fetchNextTask])

  return { nextTask, nextTaskLoading, nextTaskError, fetchNextTask }
}

export type UseTaskStatusReturn = {
  pendingTaskId: string | null
  taskStatusMessage: string | null
  taskStatusError: string | null
  handleMoveTask: (
    taskId: string,
    nextStatus: 'todo' | 'active' | 'blocked' | 'done',
  ) => Promise<void>
}

/**
 * Converts board status format to API status format
 * @param status - Board status ('todo' | 'active' | 'blocked' | 'done')
 * @returns API status string ('in_progress' for 'active', otherwise same)
 */
function boardStatusToApiStatus(status: 'todo' | 'active' | 'blocked' | 'done'): string {
  return status === 'active' ? 'in_progress' : status
}

/**
 * Converts API status format to board status format
 * @param status - API status string
 * @returns Board status ('todo' | 'active' | 'blocked' | 'done')
 */
function apiStatusToBoardStatus(status: string): 'todo' | 'active' | 'blocked' | 'done' {
  if (status === 'in_progress' || status === 'ready') return 'active'
  if (status === 'todo') return 'todo'
  if (status === 'blocked') return 'blocked'
  if (status === 'done') return 'done'
  return status as 'todo' | 'active' | 'blocked' | 'done'
}

/**
 * Manages task status updates with optimistic UI
 * @param id - Project ID
 * @param project - Current project data
 * @param setProject - State setter for project
 * @returns Task status update handlers and state
 */
export function useTaskStatus(
  id: string | undefined,
  project: ProjectDetail | null,
  setProject: React.Dispatch<React.SetStateAction<ProjectDetail | null>>,
): UseTaskStatusReturn {
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null)
  const [taskStatusMessage, setTaskStatusMessage] = useState<string | null>(null)
  const [taskStatusError, setTaskStatusError] = useState<string | null>(null)

  const handleMoveTask = useCallback(
    async (taskId: string, nextStatus: 'todo' | 'active' | 'blocked' | 'done') => {
      if (!id || !project) {
        return
      }

      const previousProject = project
      setPendingTaskId(taskId)
      setTaskStatusError(null)
      setTaskStatusMessage(null)
      setProject(current => (current ? updateTaskStatus(current, taskId, nextStatus) : current))

      try {
        const apiStatus = boardStatusToApiStatus(nextStatus)
        const response = await fetch(`/api/projects/${encodeURIComponent(id)}/tasks/${taskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: apiStatus }),
        })
        const payload = (await response.json()) as { error?: string; status?: string }
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to update task status')
        }

        const finalStatus = apiStatusToBoardStatus(payload.status ?? apiStatus)
        setProject(current => (current ? updateTaskStatus(current, taskId, finalStatus) : current))
        setTaskStatusMessage(`Updated ${taskId} to ${finalStatus}.`)
      } catch (updateError) {
        setProject(previousProject)
        setTaskStatusError(
          updateError instanceof Error ? updateError.message : 'Unknown error updating task',
        )
      } finally {
        setPendingTaskId(current => (current === taskId ? null : current))
      }
    },
    [id, project, setProject],
  )

  return { pendingTaskId, taskStatusMessage, taskStatusError, handleMoveTask }
}

export type UseIssuePreviewReturn = {
  issueState: IssueState | null
  handleBlockedTaskSelect: (task: BoardTask) => Promise<void>
  clearIssueState: () => void
}

/**
 * Fetches issue preview markdown for blocked tasks
 * @param id - Project ID to fetch issue for
 * @returns Issue preview state with handlers for selecting tasks and clearing
 */
export function useIssuePreview(id: string | undefined): UseIssuePreviewReturn {
  const [issueState, setIssueState] = useState<IssueState | null>(null)

  const handleBlockedTaskSelect = useCallback(
    async (task: BoardTask) => {
      if (!id) {
        return
      }

      setIssueState({
        loading: true,
        error: null,
        task,
        issue: null,
      })

      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(id)}/issues/${encodeURIComponent(task.id)}`,
        )
        const payload = (await response.json()) as IssuePreview & { error?: string }
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to load issue markdown')
        }

        setIssueState({
          loading: false,
          error: null,
          task,
          issue: {
            fileName: payload.fileName,
            path: payload.path,
            content: payload.content,
            matchReason: payload.matchReason,
          },
        })
      } catch (issueError) {
        setIssueState({
          loading: false,
          error: issueError instanceof Error ? issueError.message : 'Unknown error',
          task,
          issue: null,
        })
      }
    },
    [id],
  )

  const clearIssueState = useCallback(() => {
    setIssueState(null)
  }, [])

  return { issueState, handleBlockedTaskSelect, clearIssueState }
}

export type UseOrchestratorRunReturn = {
  running: boolean
  runStatus: string | null
  triggerRun: () => Promise<void>
}

/**
 * Triggers orchestrator run for a project
 * @param id - Project ID to trigger run for
 * @returns Run state with trigger function
 */
export function useOrchestratorRun(id: string | undefined): UseOrchestratorRunReturn {
  const [running, setRunning] = useState(false)
  const [runStatus, setRunStatus] = useState<string | null>(null)

  const triggerRun = useCallback(async () => {
    if (!id) {
      return
    }

    setRunning(true)
    setRunStatus(null)

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(id)}/run`, {
        method: 'POST',
      })
      const payload = (await response.json()) as { error?: string; status?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to trigger orchestrator run')
      }
      setRunStatus(payload.status ?? 'started')
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Unknown error'
      setRunStatus(message)
    } finally {
      setRunning(false)
    }
  }, [id])

  return { running, runStatus, triggerRun }
}

export type UseProjectStatsReturn = {
  tracks: number
  tasks: number
  blocked: number
  active: number
  done: number
}

/**
 * Computes project statistics (tracks, tasks, blocked, active, done)
 * @param project - Project to compute stats for (or null)
 * @returns Object with counts for tracks, tasks, blocked, active, and done
 */
export function useProjectStats(project: ProjectDetail | null): UseProjectStatsReturn {
  return useMemo(() => {
    if (!project) {
      return { tracks: 0, tasks: 0, blocked: 0, active: 0, done: 0 }
    }

    const tasks = (project.tracks ?? []).flatMap(track =>
      (track.phases ?? []).flatMap(phase => phase.tasks ?? []),
    )

    return {
      tracks: (project.tracks ?? []).length,
      tasks: tasks.length,
      blocked: tasks.filter(task => task.status === 'blocked').length,
      active: tasks.filter(task => task.status === 'in_progress' || task.status === 'active')
        .length,
      done: tasks.filter(task => task.status === 'done').length,
    }
  }, [project])
}

export { formatTimestamp }
