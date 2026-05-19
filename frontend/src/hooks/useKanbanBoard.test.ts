import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useSprintBoard,
  useProjectSprints,
  useActiveSprint,
  updateTaskStatus,
  updateSprintStatus,
  closeSprint,
} from './useKanbanBoard'

describe('useSprintBoard', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null board when sprintId is undefined', () => {
    const { result } = renderHook(() => useSprintBoard(undefined))
    expect(result.current.board).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('fetches board data on mount', async () => {
    const mockBoard = {
      sprint: {
        _id: 's1',
        projectId: 'p1',
        name: 'Sprint 1',
        status: 'active',
        budget: 1000,
        actualCost: 200,
        pointsDelivered: 5,
        taskCount: 3,
        completedCount: 1,
        createdAt: 1000,
      },
      tasks: [
        {
          _id: 't1',
          projectId: 'p1',
          sprintId: 's1',
          title: 'Task 1',
          description: 'Desc',
          storyPoints: 3,
          status: 'in_progress' as const,
          priority: 'high' as const,
          costEstimate: 50,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ],
      agents: [{ _id: 'a1', name: 'Alice', role: 'architect', status: 'active' }],
    }

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ data: mockBoard }),
        }),
      ),
    )

    const { result } = renderHook(() => useSprintBoard('s1'))

    const { waitFor } = await import('@testing-library/react')
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.board).toEqual(mockBoard)
    expect(result.current.error).toBeNull()
  })

  it('sets error on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 500 })),
    )

    const { result } = renderHook(() => useSprintBoard('s1'))

    const { waitFor } = await import('@testing-library/react')
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toContain('Failed to fetch board')
    expect(result.current.board).toBeNull()
  })

  it('refresh re-fetches board data', async () => {
    const mockBoard = {
      sprint: { _id: 's1', projectId: 'p1', name: 'Sprint 1', status: 'active', budget: 100, actualCost: 0, pointsDelivered: 0, taskCount: 0, completedCount: 0, createdAt: 0 },
      tasks: [],
      agents: [],
    }

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ data: mockBoard }),
        }),
      ),
    )

    const { result } = renderHook(() => useSprintBoard('s1'))

    const { waitFor } = await import('@testing-library/react')
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.refresh()
    })

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)
  })
})

describe('useProjectSprints', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns empty sprints when projectId is undefined', () => {
    const { result } = renderHook(() => useProjectSprints(undefined))
    expect(result.current.sprints).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('fetches sprints for a project', async () => {
    const mockSprints = [
      { _id: 's1', projectId: 'p1', name: 'Sprint 1', status: 'active', budget: 100, actualCost: 0, pointsDelivered: 0, taskCount: 0, completedCount: 0, createdAt: 0 },
      { _id: 's2', projectId: 'p1', name: 'Sprint 2', status: 'planned', budget: 200, actualCost: 0, pointsDelivered: 0, taskCount: 0, completedCount: 0, createdAt: 0 },
    ]

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ data: mockSprints }),
        }),
      ),
    )

    const { result } = renderHook(() => useProjectSprints('p1'))

    const { waitFor } = await import('@testing-library/react')
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.sprints).toEqual(mockSprints)
    expect(result.current.error).toBeNull()
  })

  it('sets error on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 404 })),
    )

    const { result } = renderHook(() => useProjectSprints('p1'))

    const { waitFor } = await import('@testing-library/react')
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toContain('Failed to fetch sprints')
  })
})

describe('useActiveSprint', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null when projectId is undefined', () => {
    const { result } = renderHook(() => useActiveSprint(undefined))
    expect(result.current.activeSprint).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('fetches active sprint', async () => {
    const mockSprint = { _id: 's1', projectId: 'p1', name: 'Sprint 1', status: 'active', budget: 100, actualCost: 0, pointsDelivered: 0, taskCount: 0, completedCount: 0, createdAt: 0 }

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ data: mockSprint }),
        }),
      ),
    )

    const { result } = renderHook(() => useActiveSprint('p1'))

    const { waitFor } = await import('@testing-library/react')
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.activeSprint).toEqual(mockSprint)
  })

  it('silently handles fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 500 })),
    )

    const { result } = renderHook(() => useActiveSprint('p1'))

    const { waitFor } = await import('@testing-library/react')
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.activeSprint).toBeNull()
  })
})

describe('updateTaskStatus', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns ok on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ ok: true }),
        }),
      ),
    )

    const result = await updateTaskStatus('t1', 'ready')
    expect(result.ok).toBe(true)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      '/api/board/tasks/t1/status',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'ready' }),
      }),
    )
  })

  it('returns error on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({ error: 'Invalid transition' }),
        }),
      ),
    )

    const result = await updateTaskStatus('t1', 'done')
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Invalid transition')
  })
})

describe('updateSprintStatus', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns ok on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) })),
    )

    const result = await updateSprintStatus('s1', 'active')
    expect(result.ok).toBe(true)
  })
})

describe('closeSprint', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns ok on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) })),
    )

    const result = await closeSprint('s1')
    expect(result.ok).toBe(true)
  })

  it('returns error on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Server error' }),
        }),
      ),
    )

    const result = await closeSprint('s1')
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Server error')
  })
})
