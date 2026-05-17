import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Mock the Convex data layer that history hooks should integrate with.
// The hooks currently do not import from this module (stub implementation),
// so these tests will fail in the Red phase until Phase 7 implementation
// wires the hooks to the query layer.
vi.mock('@/lib/useConvexData', () => ({
  useSprintHistoryQuery: vi.fn(),
  useAgentHistoryQuery: vi.fn(),
  useTaskHistoryQuery: vi.fn(),
}))

import { useSprintHistory, useAgentHistory, useTaskHistory } from './useSprintHistory'

describe('useSprintHistory', () => {
  it('fetches sprint history from Convex query layer', async () => {
    const { useSprintHistoryQuery } = await import('@/lib/useConvexData')
    ;(useSprintHistoryQuery as ReturnType<typeof vi.fn>).mockReturnValue([
      {
        _id: 'sprint-1',
        name: 'Sprint 1',
        status: 'closed',
        budget: 500,
        actualCost: 487.33,
        pointsDelivered: 24,
        pointsEstimated: 28,
        taskCount: 12,
        completedCount: 10,
        velocity: 2.0,
        createdAt: Date.now(),
        projectId: 'project-1',
      },
    ])

    const { result } = renderHook(() => useSprintHistory())

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current).toHaveLength(1)
    })
    expect(result.current?.[0].name).toBe('Sprint 1')
    expect(result.current?.[0].velocity).toBe(2.0)
  })

  it('returns undefined while sprint data is loading', async () => {
    const { useSprintHistoryQuery } = await import('@/lib/useConvexData')
    ;(useSprintHistoryQuery as ReturnType<typeof vi.fn>).mockReturnValue(undefined)

    const { result } = renderHook(() => useSprintHistory())

    expect(result.current).toBeUndefined()
  })

  it('returns empty array when no sprint history exists', async () => {
    const { useSprintHistoryQuery } = await import('@/lib/useConvexData')
    ;(useSprintHistoryQuery as ReturnType<typeof vi.fn>).mockReturnValue([])

    const { result } = renderHook(() => useSprintHistory())

    await waitFor(() => {
      expect(result.current).toEqual([])
    })
  })

  it('passes limit to Convex query for pagination', async () => {
    const { useSprintHistoryQuery } = await import('@/lib/useConvexData')
    ;(useSprintHistoryQuery as ReturnType<typeof vi.fn>).mockReturnValue(undefined)

    renderHook(() => useSprintHistory())

    expect(useSprintHistoryQuery).toHaveBeenCalledWith(
      expect.objectContaining({ limit: expect.any(Number) }),
    )
  })

  it('surfaces query errors for error boundary retry', async () => {
    const { useSprintHistoryQuery } = await import('@/lib/useConvexData')
    ;(useSprintHistoryQuery as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Project not found')
    })

    const { result } = renderHook(() => useSprintHistory())

    expect(result.error).toBeDefined()
    expect(result.error?.message).toContain('Project not found')
  })

  it('handles large dataset pagination without OOM', async () => {
    const { useSprintHistoryQuery } = await import('@/lib/useConvexData')
    const largeDataset = Array.from({ length: 100 }, (_, i) => ({
      _id: `sprint-${i}`,
      name: `Sprint ${i}`,
      status: 'closed',
      budget: 500,
      actualCost: 400,
      pointsDelivered: 20,
      pointsEstimated: 25,
      taskCount: 10,
      completedCount: 8,
      velocity: 2.0,
      createdAt: Date.now(),
      projectId: 'project-1',
    }))
    ;(useSprintHistoryQuery as ReturnType<typeof vi.fn>).mockReturnValue(largeDataset)

    const { result } = renderHook(() => useSprintHistory())

    await waitFor(() => {
      expect(result.current).toHaveLength(100)
    })
  })
})

describe('useAgentHistory', () => {
  it('fetches agent history from Convex query layer', async () => {
    const { useAgentHistoryQuery } = await import('@/lib/useConvexData')
    ;(useAgentHistoryQuery as ReturnType<typeof vi.fn>).mockReturnValue([
      {
        _id: 'agent-1',
        name: 'alice',
        displayName: 'Alice',
        model: 'claude-opus',
        tasksCompleted: 42,
        totalCost: 1250.5,
        avgLatencyMs: 3400,
        reliability: 0.95,
        periodStart: Date.now() - 1000 * 60 * 60 * 24 * 30,
        periodEnd: Date.now(),
      },
    ])

    const { result } = renderHook(() => useAgentHistory())

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current).toHaveLength(1)
    })
    expect(result.current?.[0].name).toBe('alice')
    expect(result.current?.[0].tasksCompleted).toBe(42)
  })

  it('returns undefined while agent data is loading', async () => {
    const { useAgentHistoryQuery } = await import('@/lib/useConvexData')
    ;(useAgentHistoryQuery as ReturnType<typeof vi.fn>).mockReturnValue(undefined)

    const { result } = renderHook(() => useAgentHistory())

    expect(result.current).toBeUndefined()
  })

  it('passes limit to Convex query for pagination', async () => {
    const { useAgentHistoryQuery } = await import('@/lib/useConvexData')
    ;(useAgentHistoryQuery as ReturnType<typeof vi.fn>).mockReturnValue(undefined)

    renderHook(() => useAgentHistory())

    expect(useAgentHistoryQuery).toHaveBeenCalledWith(
      expect.objectContaining({ limit: expect.any(Number) }),
    )
  })

  it('surfaces query errors for error boundary retry', async () => {
    const { useAgentHistoryQuery } = await import('@/lib/useConvexData')
    ;(useAgentHistoryQuery as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Agent query failed')
    })

    const { result } = renderHook(() => useAgentHistory())

    expect(result.error).toBeDefined()
    expect(result.error?.message).toContain('Agent query failed')
  })
})

describe('useTaskHistory', () => {
  it('fetches task history from Convex query layer', async () => {
    const { useTaskHistoryQuery } = await import('@/lib/useConvexData')
    ;(useTaskHistoryQuery as ReturnType<typeof vi.fn>).mockReturnValue([
      {
        _id: 'task-1',
        title: 'Fix auth bug',
        status: 'done',
        agent: 'alice',
        projectSlug: 'foundation',
        sprintId: 'sprint-1',
        cost: 12.5,
        storyPoints: 3,
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 28,
        completedAt: Date.now() - 1000 * 60 * 60 * 24 * 26,
      },
    ])

    const { result } = renderHook(() => useTaskHistory())

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current).toHaveLength(1)
    })
    expect(result.current?.[0].title).toBe('Fix auth bug')
  })

  it('returns undefined while task data is loading', async () => {
    const { useTaskHistoryQuery } = await import('@/lib/useConvexData')
    ;(useTaskHistoryQuery as ReturnType<typeof vi.fn>).mockReturnValue(undefined)

    const { result } = renderHook(() => useTaskHistory())

    expect(result.current).toBeUndefined()
  })

  it('passes filter params to Convex query', async () => {
    const { useTaskHistoryQuery } = await import('@/lib/useConvexData')
    ;(useTaskHistoryQuery as ReturnType<typeof vi.fn>).mockReturnValue(undefined)

    renderHook(() => useTaskHistory())

    expect(useTaskHistoryQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: expect.any(String),
        limit: expect.any(Number),
      }),
    )
  })

  it('surfaces query errors for error boundary retry', async () => {
    const { useTaskHistoryQuery } = await import('@/lib/useConvexData')
    ;(useTaskHistoryQuery as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Task query failed')
    })

    const { result } = renderHook(() => useTaskHistory())

    expect(result.error).toBeDefined()
    expect(result.error?.message).toContain('Task query failed')
  })
})
