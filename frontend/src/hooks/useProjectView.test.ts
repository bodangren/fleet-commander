import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import {
  useProjectLoader,
  useNextTask,
  useTaskStatus,
  useOrchestratorRun,
  useProjectStats,
  formatTimestamp,
} from './useProjectView'
import type { ProjectDetail } from '@/lib/fleetTypes'

const mockProject = {
  id: 'proj-1',
  name: 'Test Project',
  path: '/test',
  tracks: [
    {
      id: 'track-one',
      name: 'Track 1',
      type: 'feature',
      description: 'First test track',
      status: 'active',
      planPath: './measure/tracks/track-one/plan.md',
      phases: [
        {
          name: 'Phase 1',
          taskCount: 2,
          doneCount: 1,
          tasks: [
            {
              id: 'track-one-task-done',
              description: 'Task 1',
              status: 'done',
              phase: 'Phase 1',
            },
            {
              id: 'track-one-task-active',
              description: 'Task 2',
              status: 'in_progress',
              phase: 'Phase 1',
            },
          ],
        },
      ],
    },
    {
      id: 'track-two',
      name: 'Track 2',
      type: 'chore',
      description: 'Second test track',
      status: 'active',
      planPath: './measure/tracks/track-two/plan.md',
      phases: [
        {
          name: 'Phase 1',
          taskCount: 1,
          doneCount: 0,
          tasks: [
            {
              id: 'track-two-task-blocked',
              description: 'Task 3',
              status: 'blocked',
              phase: 'Phase 1',
            },
          ],
        },
      ],
    },
  ],
  lastUpdated: 1712000000,
} satisfies ProjectDetail

const targetTaskId = 'track-one-task-active'

function taskStatus(project: ProjectDetail, taskId: string) {
  const task = project.tracks
    .flatMap(track => track.phases)
    .flatMap(phase => phase.tasks)
    .find(task => task.id === taskId)

  if (!task) {
    throw new Error(`Task ${taskId} is missing from the test project`)
  }

  return task.status
}

function routerWrapper({ children }: { children: ReactNode }) {
  return createElement(MemoryRouter, null, children)
}

describe('formatTimestamp', () => {
  it('returns "Unknown" for falsy values', () => {
    expect(formatTimestamp(0)).toBe('Unknown')
    expect(formatTimestamp(undefined as unknown as number)).toBe('Unknown')
  })

  it('formats valid timestamp', () => {
    const result = formatTimestamp(1712000000)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('useProjectLoader', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sets error when id is missing', async () => {
    const { result } = renderHook(() => useProjectLoader(undefined), { wrapper: routerWrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Project id is missing from the route.')
    expect(result.current.project).toBeNull()
  })

  it('fetches project data on mount', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => mockProject })),
    )

    const { result } = renderHook(() => useProjectLoader('proj-1'), { wrapper: routerWrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.project).toEqual(mockProject)
    expect(result.current.error).toBeNull()
  })

  it('sets error on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Not found' }),
        }),
      ),
    )

    const { result } = renderHook(() => useProjectLoader('missing'), { wrapper: routerWrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Not found')
  })
})

describe('useNextTask', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does nothing when id is undefined', async () => {
    const { result } = renderHook(() => useNextTask(undefined))
    expect(result.current.nextTask).toBeNull()
    expect(result.current.nextTaskLoading).toBe(false)
  })

  it('fetches next task on mount', async () => {
    const mockTask = { taskKey: 't1', score: 0.9 }
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => mockTask })),
    )

    const { result } = renderHook(() => useNextTask('proj-1'))

    await waitFor(() => {
      expect(result.current.nextTaskLoading).toBe(false)
    })

    expect(result.current.nextTask).toEqual(mockTask)
  })

  it('sets nextTask to null on 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 404, json: async () => ({}) })),
    )

    const { result } = renderHook(() => useNextTask('proj-1'))

    await waitFor(() => {
      expect(result.current.nextTaskLoading).toBe(false)
    })

    expect(result.current.nextTask).toBeNull()
  })

  it('exposes a visible error for failed next-task reads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Catalog unavailable' }),
        }),
      ),
    )

    const { result } = renderHook(() => useNextTask('proj-1'))

    await waitFor(() => {
      expect(result.current.nextTaskLoading).toBe(false)
    })

    expect(result.current.nextTask).toBeNull()
    expect(result.current.nextTaskError).toBe('Catalog unavailable')
  })
})

describe('useTaskStatus', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does nothing when id or project is missing', async () => {
    const { result } = renderHook(() => useTaskStatus(undefined, null, vi.fn()))

    await act(async () => {
      await result.current.handleMoveTask(targetTaskId, 'done')
    })

    expect(result.current.pendingTaskId).toBeNull()
  })

  it('optimistically updates task status and reverts on error', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Update failed' }),
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const setProject = vi.fn()
    const { result } = renderHook(() => useTaskStatus('proj-1', mockProject, setProject))

    await act(async () => {
      await result.current.handleMoveTask(targetTaskId, 'done')
    })

    const optimisticUpdate = setProject.mock.calls[0]?.[0]
    expect(optimisticUpdate).toBeTypeOf('function')
    if (typeof optimisticUpdate !== 'function') {
      throw new Error('Expected an optimistic project-state updater')
    }
    const optimisticallyUpdated = optimisticUpdate(mockProject) as ProjectDetail

    expect(taskStatus(optimisticallyUpdated, targetTaskId)).toBe('done')
    expect(taskStatus(optimisticallyUpdated, 'track-one-task-done')).toBe('done')
    expect(taskStatus(optimisticallyUpdated, 'track-two-task-blocked')).toBe('blocked')
    expect(setProject).toHaveBeenNthCalledWith(2, mockProject)
    expect(fetchMock).toHaveBeenCalledWith(`/api/projects/proj-1/tasks/${targetTaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
    expect(result.current.taskStatusError).toBe('Update failed')
  })

  it('successfully updates task status', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ status: 'done' }),
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const setProject = vi.fn()
    const { result } = renderHook(() => useTaskStatus('proj-1', mockProject, setProject))

    await act(async () => {
      await result.current.handleMoveTask(targetTaskId, 'done')
    })

    const optimisticUpdate = setProject.mock.calls[0]?.[0]
    const confirmedUpdate = setProject.mock.calls[1]?.[0]
    expect(optimisticUpdate).toBeTypeOf('function')
    expect(confirmedUpdate).toBeTypeOf('function')
    if (typeof optimisticUpdate !== 'function' || typeof confirmedUpdate !== 'function') {
      throw new Error('Expected optimistic and confirmed project-state updaters')
    }
    const optimisticallyUpdated = optimisticUpdate(mockProject) as ProjectDetail
    const confirmedProject = confirmedUpdate(optimisticallyUpdated) as ProjectDetail

    expect(taskStatus(confirmedProject, targetTaskId)).toBe('done')
    expect(taskStatus(confirmedProject, 'track-one-task-done')).toBe('done')
    expect(taskStatus(confirmedProject, 'track-two-task-blocked')).toBe('blocked')
    expect(fetchMock).toHaveBeenCalledWith(`/api/projects/proj-1/tasks/${targetTaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
    expect(result.current.taskStatusMessage).toContain('Updated')
    expect(result.current.taskStatusError).toBeNull()
  })
})

describe('useOrchestratorRun', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does nothing when id is undefined', async () => {
    const { result } = renderHook(() => useOrchestratorRun(undefined))

    await act(async () => {
      await result.current.triggerRun('track-1-task-1')
    })

    expect(result.current.running).toBe(false)
  })

  it('triggers run successfully', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ status: 'succeeded', taskKey: 'track-1-task-1' }),
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useOrchestratorRun('proj-1'))

    await act(async () => {
      await result.current.triggerRun('track-1-task-1')
    })

    expect(result.current.runStatus).toBe('succeeded')
    expect(result.current.runTaskKey).toBe('track-1-task-1')
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/proj-1/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskKey: 'track-1-task-1' }),
    })
    expect(result.current.running).toBe(false)
  })

  it('handles run failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Run failed' }),
        }),
      ),
    )

    const { result } = renderHook(() => useOrchestratorRun('proj-1'))

    await act(async () => {
      await result.current.triggerRun('track-1-task-1')
    })

    expect(result.current.runStatus).toBe('Run failed')
    expect(result.current.runError).toBe('Run failed')
  })

  it('shows the human-readable runner failure instead of its machine code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: async () => ({
            error: 'project_run_failed',
            message: 'Pi process could not start',
          }),
        }),
      ),
    )

    const { result } = renderHook(() => useOrchestratorRun('proj-1'))
    await act(async () => {
      await result.current.triggerRun('track-1-task-1')
    })

    expect(result.current.runStatus).toBe('Pi process could not start')
    expect(result.current.runError).toBe('Pi process could not start')
  })
})

describe('useProjectStats', () => {
  it('returns zeros for null project', () => {
    const { result } = renderHook(() => useProjectStats(null))
    expect(result.current).toEqual({ tracks: 0, tasks: 0, blocked: 0, active: 0, done: 0 })
  })

  it('computes stats from project', () => {
    const { result } = renderHook(() => useProjectStats(mockProject))
    expect(result.current.tracks).toBe(2)
    expect(result.current.tasks).toBe(3)
    expect(result.current.done).toBe(1)
    expect(result.current.active).toBe(1)
    expect(result.current.blocked).toBe(1)
  })
})
