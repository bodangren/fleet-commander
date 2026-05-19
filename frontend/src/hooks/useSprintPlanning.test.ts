import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  useSprintPlanningRecommendation,
  useProjectStats,
  createSprint,
} from './useSprintPlanning'

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

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => mockRec,
        }),
      ),
    )

    const { result } = renderHook(() => useSprintPlanningRecommendation('p1'))

    const { waitFor } = await import('@testing-library/react')
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.recommendation).toEqual(mockRec)
    expect(result.current.error).toBeNull()
  })

  it('sets error on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 500 })),
    )

    const { result } = renderHook(() => useSprintPlanningRecommendation('p1'))

    const { waitFor } = await import('@testing-library/react')
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toContain('Failed to fetch recommendation')
  })
})

describe('useProjectStats', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null when projectId is undefined', () => {
    const { result } = renderHook(() => useProjectStats(undefined))
    expect(result.current.stats).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('fetches project stats', async () => {
    const mockStats = { backlogCount: 5, totalPoints: 15, activeSprintCount: 1 }

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => mockStats,
        }),
      ),
    )

    const { result } = renderHook(() => useProjectStats('p1'))

    const { waitFor } = await import('@testing-library/react')
    await waitFor(() => expect(result.current.loading).toBe(false))

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
