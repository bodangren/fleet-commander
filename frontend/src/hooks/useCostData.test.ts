import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Mock the Convex data layer that cost hooks should integrate with.
// useCostData currently returns undefined (stub implementation),
// so these tests will fail in the Red phase until Phase 7 implementation
// wires the hook to the query layer.
vi.mock('@/lib/useConvexData', () => ({
  useConvexQuery: vi.fn(),
}))

import { useCostData } from './useCostData'

describe('useCostData', () => {
  it('calls Convex insights:getCostOverview query', async () => {
    const { useConvexQuery } = await import('@/lib/useConvexData')
    ;(useConvexQuery as ReturnType<typeof vi.fn>).mockReturnValue(undefined)

    renderHook(() => useCostData())

    expect(useConvexQuery).toHaveBeenCalledWith(
      'insights:getCostOverview',
      expect.any(Object),
      true,
    )
  })

  it('returns cost data when query resolves', async () => {
    const { useConvexQuery } = await import('@/lib/useConvexData')
    ;(useConvexQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      costTrend: [
        {
          sprintName: 'Sprint 1',
          costPerPoint: 2.0,
          pointsDelivered: 10,
          targetCostPerPoint: 2.0,
        },
      ],
      agentEfficiency: [
        {
          agentName: 'Alice',
          model: 'claude-opus',
          totalPoints: 10,
          totalCost: 20,
          costPerPoint: 2.0,
          reliability: 0.95,
          valueScore: 'Standard',
        },
      ],
      roiSummary: {
        avgCostPerPoint: 2.0,
        pointsPerDollar: 0.5,
        estimatedProjectCost: 1000,
      },
      optimizations: [
        {
          title: 'Test',
          description: 'Test desc',
          potentialSavings: 100,
          priority: 'high',
        },
      ],
    })

    const { result } = renderHook(() => useCostData())

    await waitFor(() => {
      expect(result.current).toBeDefined()
    })
    expect(result.current?.costTrend).toHaveLength(1)
    expect(result.current?.agentEfficiency[0].agentName).toBe('Alice')
  })

  it('returns undefined while cost data is loading', async () => {
    const { useConvexQuery } = await import('@/lib/useConvexData')
    ;(useConvexQuery as ReturnType<typeof vi.fn>).mockReturnValue(undefined)

    const { result } = renderHook(() => useCostData())

    expect(result.current).toBeUndefined()
  })

  it('surfaces query errors for error boundary retry', async () => {
    const { useConvexQuery } = await import('@/lib/useConvexData')
    ;(useConvexQuery as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Cost query failed')
    })

    expect(() => renderHook(() => useCostData())).toThrow('Cost query failed')
  })
})
