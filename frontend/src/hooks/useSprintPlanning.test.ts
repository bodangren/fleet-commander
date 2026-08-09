import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const mockUseConvexQuery = vi.fn()

vi.mock('@/lib/useConvexData', () => ({
  useConvexQuery: (...args: unknown[]) => mockUseConvexQuery(...args),
}))

import { renderHook, waitFor } from '@testing-library/react'
import { useSprintPlanningRecommendation, useProjectStats, createSprint } from './useSprintPlanning'

describe('useSprintPlanningRecommendation', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null when projectId is undefined', () => {
    const { result } = renderHook(() => useSprintPlanningRecommendation(undefined))
    expect(result.current.recommendation).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('fetches recommendation on mount', async () => {
    const mockRec = {
      tasks: [
        {
          taskId: 't1',
          taskTitle: 'Task 1',
          storyPoints: 3,
          priority: 'high',
          assignedAgentId: 'a1',
          assignedAgentName: 'Alice',
          agentRole: 'architect',
          costPerPoint: 4.2,
          estimatedCost: 12.6,
          selected: true,
        },
      ],
      agentBreakdown: [
        {
          agentId: 'a1',
          agentName: 'Alice',
          role: 'architect',
          totalPoints: 3,
          costPerPoint: 4.2,
          totalCost: 12.6,
          taskCount: 1,
        },
      ],
      totalPoints: 3,
      totalCost: 12.6,
      taskCount: 1,
      avgCostPerPoint: 4.2,
      recommendedBudget: 15,
      bufferPercent: 15,
    }

    let resolveFetch: (response: { ok: boolean; json: () => Promise<typeof mockRec> }) => void
    const fetchPromise = new Promise<{ ok: boolean; json: () => Promise<typeof mockRec> }>(
      resolve => {
        resolveFetch = resolve
      },
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(() => fetchPromise),
    )

    const { result } = renderHook(() => useSprintPlanningRecommendation('p1'))

    await waitFor(() => expect(result.current.loading).toBe(true))
    resolveFetch!({
      ok: true,
      json: async () => mockRec,
    })
    await waitFor(() => expect(result.current.recommendation).toEqual(mockRec))

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets error on fetch failure', async () => {
    let resolveFetch: (response: { ok: boolean; status: number }) => void
    const fetchPromise = new Promise<{ ok: boolean; status: number }>(resolve => {
      resolveFetch = resolve
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(() => fetchPromise),
    )

    const { result } = renderHook(() => useSprintPlanningRecommendation('p1'))

    await waitFor(() => expect(result.current.loading).toBe(true))
    resolveFetch!({ ok: false, status: 500 })
    await waitFor(() => expect(result.current.error).toContain('Failed to fetch recommendation'))

    expect(result.current.loading).toBe(false)
  })
})

describe('useProjectStats', () => {
  beforeEach(() => {
    mockUseConvexQuery.mockReset()
  })

  it('returns null when projectId is undefined', () => {
    mockUseConvexQuery.mockReturnValue(undefined)
    const { result } = renderHook(() => useProjectStats(undefined))
    expect(result.current.stats).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('calls useConvexQuery with correct args', () => {
    mockUseConvexQuery.mockReturnValue(undefined)
    renderHook(() => useProjectStats('p1'))
    expect(mockUseConvexQuery).toHaveBeenCalledWith(
      'sprintPlanning:getProjectStatsHandler',
      { projectId: 'p1' },
      true,
    )
  })

  it('returns loading state when data is undefined', () => {
    mockUseConvexQuery.mockReturnValue(undefined)
    const { result } = renderHook(() => useProjectStats('p1'))
    expect(result.current.loading).toBe(true)
    expect(result.current.stats).toBeNull()
  })

  it('returns stats when data arrives', () => {
    const mockStats = { backlogCount: 5, totalPoints: 15, activeSprintCount: 1 }
    mockUseConvexQuery.mockReturnValue(mockStats)
    const { result } = renderHook(() => useProjectStats('p1'))
    expect(result.current.loading).toBe(false)
    expect(result.current.stats).toEqual(mockStats)
  })
})

describe('createSprint', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns ok and sprintId on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ ok: true, sprintId: 's1' }),
        }),
      ),
    )

    const result = await createSprint({
      projectId: 'p1',
      name: 'Sprint 1',
      budget: 100,
      taskAssignments: [{ taskId: 't1', agentId: 'a1' }],
    })

    expect(result.ok).toBe(true)
    expect(result.sprintId).toBe('s1')
  })

  it('returns error on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({ error: 'Invalid budget' }),
        }),
      ),
    )

    const result = await createSprint({
      projectId: 'p1',
      name: 'Sprint 1',
      budget: -10,
      taskAssignments: [],
    })

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Invalid budget')
  })
})
