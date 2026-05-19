import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDashboardData } from './useDashboardData'

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('fetches dashboard data on mount', async () => {
    const mockData = {
      sprint: {
        _id: 's1',
        name: 'Sprint 1',
        status: 'active',
        budget: 100,
        actualCost: 50,
        pointsDelivered: 10,
        taskCount: 5,
        completedCount: 3,
      },
      tasks: [
        {
          _id: 't1',
          title: 'Task 1',
          status: 'done',
          storyPoints: 3,
          actualCost: 10,
          priority: 'high',
        },
      ],
      agents: [
        {
          _id: 'a1',
          name: 'alice',
          role: 'architect',
          status: 'active',
          workload: 1,
          maxWorkload: 5,
        },
      ],
      pipelineRuns: [
        {
          _id: 'r1',
          taskId: 't1',
          stage: 'dispatch',
          agentId: 'a1',
          startTime: Date.now(),
          status: 'completed',
          cost: 2,
        },
      ],
      alerts: [
        {
          _id: 'al1',
          type: 'budget_breach',
          severity: 'warning',
          message: 'Budget at 80%',
          createdAt: Date.now(),
        },
      ],
      metrics: { deliveryRate: 0.5, successRate: 80, avgPipelineTime: 120000, rejectionRate: 5 },
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockData }),
    } as Response)

    const { result } = renderHook(() => useDashboardData())

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBeNull()
  })

  it('includes projectId in URL when provided', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          sprint: null,
          tasks: [],
          agents: [],
          pipelineRuns: [],
          alerts: [],
          metrics: { deliveryRate: 0, successRate: 0, avgPipelineTime: 0, rejectionRate: 0 },
        },
      }),
    } as Response)

    renderHook(() => useDashboardData('proj123'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/dashboard?projectId=proj123')
    })
  })

  it('sets error on HTTP failure', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    const { result } = renderHook(() => useDashboardData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toContain('HTTP 500')
    expect(result.current.data).toBeNull()
  })

  it('sets error on API error response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: 'Something went wrong' }),
    } as Response)

    const { result } = renderHook(() => useDashboardData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Something went wrong')
  })

  it('refresh re-fetches data', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            sprint: null,
            tasks: [],
            agents: [],
            pipelineRuns: [],
            alerts: [],
            metrics: { deliveryRate: 0, successRate: 0, avgPipelineTime: 0, rejectionRate: 0 },
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            sprint: {
              _id: 's1',
              name: 'Sprint 2',
              status: 'active',
              budget: 200,
              actualCost: 100,
              pointsDelivered: 20,
              taskCount: 10,
              completedCount: 6,
            },
            tasks: [],
            agents: [],
            pipelineRuns: [],
            alerts: [],
            metrics: { deliveryRate: 0, successRate: 0, avgPipelineTime: 0, rejectionRate: 0 },
          },
        }),
      } as Response)

    const { result } = renderHook(() => useDashboardData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    result.current.refresh()

    await waitFor(() => {
      expect(result.current.data?.sprint?.name).toBe('Sprint 2')
    })

    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
