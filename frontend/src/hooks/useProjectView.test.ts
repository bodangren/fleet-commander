import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useProjectLoader,
  useNextTask,
  useTaskStatus,
  useOrchestratorRun,
  useProjectStats,
  formatTimestamp,
} from './useProjectView'
import type { ProjectDetail } from '@/lib/fleetTypes'

const mockProject: ProjectDetail = {
  id: 'proj-1',
  name: 'Test Project',
  path: '/test',
  status: 'active',
  tracks: [
    {
      name: 'Track 1',
      phases: [
        {
          name: 'Phase 1',
          tasks: [
            {
              id: 't1',
              description: 'Task 1',
              status: 'done',
              phase: 'Phase 1',
              trackName: 'Track 1',
            },
            {
              id: 't2',
              description: 'Task 2',
              status: 'active',
              phase: 'Phase 1',
              trackName: 'Track 1',
            },
          ],
        },
      ],
    },
    {
      name: 'Track 2',
      phases: [
        {
          name: 'Phase 1',
          tasks: [
            {
              id: 't3',
              description: 'Task 3',
              status: 'blocked',
              phase: 'Phase 1',
              trackName: 'Track 2',
            },
          ],
        },
      ],
    },
  ],
} as ProjectDetail

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
    const { result } = renderHook(() => useProjectLoader(undefined))

    const { waitFor: wait } = await import('@testing-library/react')
    await wait(() => {
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

    const { result } = renderHook(() => useProjectLoader('proj-1'))

    const { waitFor: wait } = await import('@testing-library/react')
    await wait(() => {
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

    const { result } = renderHook(() => useProjectLoader('missing'))

    const { waitFor: wait } = await import('@testing-library/react')
    await wait(() => {
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

    const { waitFor: wait } = await import('@testing-library/react')
    await wait(() => {
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

    const { waitFor: wait } = await import('@testing-library/react')
    await wait(() => {
      expect(result.current.nextTaskLoading).toBe(false)
    })

    expect(result.current.nextTask).toBeNull()
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
      await result.current.handleMoveTask('t1', 'done')
    })

    expect(result.current.pendingTaskId).toBeNull()
  })

  it('optimistically updates task status and reverts on error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Update failed' }),
        }),
      ),
    )

    const setProject = vi.fn()
    const { result } = renderHook(() => useTaskStatus('proj-1', mockProject, setProject))

    await act(async () => {
      await result.current.handleMoveTask('t1', 'done')
    })

    expect(setProject).toHaveBeenCalledTimes(2) // optimistic + revert
    expect(result.current.taskStatusError).toBe('Update failed')
  })

  it('successfully updates task status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ status: 'done' }),
        }),
      ),
    )

    const setProject = vi.fn()
    const { result } = renderHook(() => useTaskStatus('proj-1', mockProject, setProject))

    await act(async () => {
      await result.current.handleMoveTask('t1', 'done')
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
      await result.current.triggerRun()
    })

    expect(result.current.running).toBe(false)
  })

  it('triggers run successfully', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ status: 'started' }),
        }),
      ),
    )

    const { result } = renderHook(() => useOrchestratorRun('proj-1'))

    await act(async () => {
      await result.current.triggerRun()
    })

    expect(result.current.runStatus).toBe('started')
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
      await result.current.triggerRun()
    })

    expect(result.current.runStatus).toBe('Run failed')
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
