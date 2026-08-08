import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDashboardData, type DashboardData } from './useDashboardData'

const dashboardData: DashboardData = {
  sprint: null,
  tasks: [],
  agents: [],
  pipelineRuns: [],
  alerts: [],
  metrics: { deliveryRate: 0, successRate: 0, avgPipelineTime: 0, rejectionRate: 0 },
}

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('settles through the Pivot API when direct Convex is unavailable', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: dashboardData }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useDashboardData('project-1'))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.data).toEqual(dashboardData))

    expect(fetchMock).toHaveBeenCalledWith('/api/dashboard?projectId=project-1', {
      signal: expect.any(AbortSignal),
    })
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('turns a malformed successful response into a finite error state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      }),
    )

    const { result } = renderHook(() => useDashboardData())

    await waitFor(() =>
      expect(result.current.error).toBe('Dashboard response did not include data'),
    )
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('surfaces finite API errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Convex unavailable' }),
      }),
    )

    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(result.current.error).toBe('Convex unavailable'))
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('times out a never-settling dashboard request after exactly 15 seconds', async () => {
    vi.useFakeTimers()
    let signal: AbortSignal | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options: { signal: AbortSignal }) => {
        signal = options.signal
        return new Promise(() => {})
      }),
    )

    const { result } = renderHook(() => useDashboardData())

    expect(result.current.loading).toBe(true)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000)
    })

    expect(signal?.aborted).toBe(true)
    expect(result.current.error).toBe('Dashboard request timed out. Please try again.')
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('aborts an in-flight request on unmount', async () => {
    let signal: AbortSignal | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options: { signal: AbortSignal }) => {
        signal = options.signal
        return new Promise(() => {})
      }),
    )

    const { unmount } = renderHook(() => useDashboardData())
    await waitFor(() => expect(signal).toBeDefined())
    unmount()
    expect(signal?.aborted).toBe(true)
  })

  it('refreshes the dashboard request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: dashboardData }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    act(() => result.current.refresh())
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })

  it('preserves the complete burn-forecast sprint contract from the API', async () => {
    const fullSprint = {
      _id: 's1',
      name: 'Sprint 1',
      status: 'active',
      budget: 500,
      actualCost: 100,
      pointsDelivered: 24,
      taskCount: 12,
      completedCount: 8,
      burnRate: 3.5,
      projectedExhaustionMs: Date.now() + 86_400_000,
      atRisk: false,
      forecastConfidence: 0.8,
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { ...dashboardData, sprint: fullSprint } }),
      }),
    )

    const { result } = renderHook(() => useDashboardData())

    await waitFor(() => expect(result.current.data?.sprint).toStrictEqual(fullSprint))
  })
})
