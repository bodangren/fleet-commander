import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const mockUseConvexQuery = vi.fn()

vi.mock('@/lib/useConvexData', () => ({
  useConvexQuery: (...args: unknown[]) => mockUseConvexQuery(...args),
}))

import { renderHook } from '@testing-library/react'
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
    mockUseConvexQuery.mockReset()
  })

  it('returns null board when sprintId is undefined', () => {
    mockUseConvexQuery.mockReturnValue(undefined)
    const { result } = renderHook(() => useSprintBoard(undefined))
    expect(result.current.board).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('calls useConvexQuery with correct args', () => {
    mockUseConvexQuery.mockReturnValue(undefined)
    renderHook(() => useSprintBoard('s1'))
    expect(mockUseConvexQuery).toHaveBeenCalledWith(
      'kanban:getSprintBoardHandler',
      { sprintId: 's1' },
      true,
    )
  })

  it('returns loading state when data is undefined', () => {
    mockUseConvexQuery.mockReturnValue(undefined)
    const { result } = renderHook(() => useSprintBoard('s1'))
    expect(result.current.loading).toBe(true)
    expect(result.current.board).toBeNull()
  })

  it('returns board data when available', () => {
    const mockBoard = {
      sprint: { _id: 's1', name: 'Sprint 1', status: 'active', budget: 100, actualCost: 0, pointsDelivered: 0, taskCount: 0, completedCount: 0, createdAt: 0, projectId: 'p1' },
      tasks: [],
      agents: [],
    }
    mockUseConvexQuery.mockReturnValue(mockBoard)
    const { result } = renderHook(() => useSprintBoard('s1'))
    expect(result.current.loading).toBe(false)
    expect(result.current.board).toEqual(mockBoard)
    expect(result.current.error).toBeNull()
  })
})

describe('useProjectSprints', () => {
  beforeEach(() => {
    mockUseConvexQuery.mockReset()
  })

  it('returns empty sprints when projectId is undefined', () => {
    mockUseConvexQuery.mockReturnValue(undefined)
    const { result } = renderHook(() => useProjectSprints(undefined))
    expect(result.current.sprints).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('calls useConvexQuery with correct args', () => {
    mockUseConvexQuery.mockReturnValue(undefined)
    renderHook(() => useProjectSprints('p1'))
    expect(mockUseConvexQuery).toHaveBeenCalledWith(
      'kanban:getSprintsByProjectHandler',
      { projectId: 'p1' },
      true,
    )
  })

  it('returns sprints when data arrives', () => {
    const mockSprints = [
      { _id: 's1', projectId: 'p1', name: 'Sprint 1', status: 'active', budget: 100, actualCost: 0, pointsDelivered: 0, taskCount: 0, completedCount: 0, createdAt: 0 },
    ]
    mockUseConvexQuery.mockReturnValue(mockSprints)
    const { result } = renderHook(() => useProjectSprints('p1'))
    expect(result.current.loading).toBe(false)
    expect(result.current.sprints).toEqual(mockSprints)
  })
})

describe('useActiveSprint', () => {
  beforeEach(() => {
    mockUseConvexQuery.mockReset()
  })

  it('returns null when projectId is undefined', () => {
    mockUseConvexQuery.mockReturnValue(undefined)
    const { result } = renderHook(() => useActiveSprint(undefined))
    expect(result.current.activeSprint).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('calls useConvexQuery with correct args', () => {
    mockUseConvexQuery.mockReturnValue(undefined)
    renderHook(() => useActiveSprint('p1'))
    expect(mockUseConvexQuery).toHaveBeenCalledWith(
      'kanban:getActiveSprintHandler',
      { projectId: 'p1' },
      true,
    )
  })

  it('returns active sprint when available', () => {
    const mockSprint = { _id: 's1', projectId: 'p1', name: 'Sprint 1', status: 'active', budget: 100, actualCost: 0, pointsDelivered: 0, taskCount: 0, completedCount: 0, createdAt: 0 }
    mockUseConvexQuery.mockReturnValue(mockSprint)
    const { result } = renderHook(() => useActiveSprint('p1'))
    expect(result.current.loading).toBe(false)
    expect(result.current.activeSprint).toEqual(mockSprint)
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
