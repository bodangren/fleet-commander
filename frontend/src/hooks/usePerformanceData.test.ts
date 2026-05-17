import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('@/lib/useConvexData', () => ({
  useConvexQuery: vi.fn(),
}))

import { usePerformanceData } from './usePerformanceData'

describe('usePerformanceData', () => {
  it('calls Convex performance:getPerformanceOverview query', async () => {
    const { useConvexQuery } = await import('@/lib/useConvexData')
    ;(useConvexQuery as ReturnType<typeof vi.fn>).mockReturnValue(undefined)

    renderHook(() => usePerformanceData())

    expect(useConvexQuery).toHaveBeenCalledWith(
      'performance:getPerformanceOverview',
      {},
    )
  })

  it('returns performance data when query resolves', async () => {
    const { useConvexQuery } = await import('@/lib/useConvexData')
    ;(useConvexQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      agents: [
        {
          _id: 'agent-1',
          name: 'alice',
          displayName: 'Alice',
          model: 'claude-opus',
          tasksCompleted: 42,
          totalCost: 1250.5,
          costPerPoint: 2.5,
          reliability: 0.95,
          rejectionRate: 0.05,
          trend: 'improving',
        },
      ],
      pipelineCosts: [
        { stage: 'Architect', cost: 450.5, percentage: 25 },
      ],
      rejectionReasons: [
        { reason: 'Code quality', count: 12, percentage: 35 },
      ],
    })

    const { result } = renderHook(() => usePerformanceData())

    await waitFor(() => {
      expect(result.current).toBeDefined()
    })
    expect(result.current?.agents).toHaveLength(1)
    expect(result.current?.agents[0].displayName).toBe('Alice')
    expect(result.current?.pipelineCosts[0].stage).toBe('Architect')
    expect(result.current?.rejectionReasons[0].reason).toBe('Code quality')
  })

  it('returns undefined while performance data is loading', async () => {
    const { useConvexQuery } = await import('@/lib/useConvexData')
    ;(useConvexQuery as ReturnType<typeof vi.fn>).mockReturnValue(undefined)

    const { result } = renderHook(() => usePerformanceData())

    expect(result.current).toBeUndefined()
  })

  it('returns undefined when query returns null', async () => {
    const { useConvexQuery } = await import('@/lib/useConvexData')
    ;(useConvexQuery as ReturnType<typeof vi.fn>).mockReturnValue(null)

    const { result } = renderHook(() => usePerformanceData())

    expect(result.current).toBeUndefined()
  })

  it('surfaces query errors for error boundary retry', async () => {
    const { useConvexQuery } = await import('@/lib/useConvexData')
    ;(useConvexQuery as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Performance query failed')
    })

    const { result } = renderHook(() => usePerformanceData())

    expect(result.error).toBeDefined()
    expect(result.error?.message).toContain('Performance query failed')
  })
})
