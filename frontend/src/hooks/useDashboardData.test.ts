import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockUseConvexQuery = vi.fn()

vi.mock('@/lib/useConvexData', () => ({
  useConvexQuery: (...args: unknown[]) => mockUseConvexQuery(...args),
}))

import { useDashboardData } from './useDashboardData'

describe('useDashboardData', () => {
  beforeEach(() => {
    mockUseConvexQuery.mockReset()
  })

  it('calls useConvexQuery with dashboard:getDashboardDataHandler', () => {
    mockUseConvexQuery.mockReturnValue(undefined)
    useDashboardData()
    expect(mockUseConvexQuery).toHaveBeenCalledWith(
      'dashboard:getDashboardDataHandler',
      { projectId: undefined },
      true,
    )
  })

  it('passes projectId when provided', () => {
    mockUseConvexQuery.mockReturnValue(undefined)
    useDashboardData('proj123')
    expect(mockUseConvexQuery).toHaveBeenCalledWith(
      'dashboard:getDashboardDataHandler',
      { projectId: 'proj123' },
      true,
    )
  })

  it('returns data from useConvexQuery', () => {
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
      tasks: [],
      agents: [],
      pipelineRuns: [],
      alerts: [],
      metrics: { deliveryRate: 0.5, successRate: 80, avgPipelineTime: 120000, rejectionRate: 5 },
    }
    mockUseConvexQuery.mockReturnValue(mockData)
    const result = useDashboardData()
    expect(result).toEqual(mockData)
  })

  it('returns undefined while loading', () => {
    mockUseConvexQuery.mockReturnValue(undefined)
    const result = useDashboardData()
    expect(result).toBeUndefined()
  })
})
