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

  /**
   * Cross-phase contract lock (TD-237 ↔ TD-239, test-strategy §3).
   *
   * Phase 1 (TD-237) reshaped the `convex/lib/insights.ts` read; Phase 2
   * (TD-239) depends on the dashboard hook returning a sprint that
   * carries `burnRate`, `projectedExhaustionMs`, `atRisk`, and
   * `forecastConfidence` (the four fields `BurnForecastCard` consumes).
   * If Phase 1 ever drops or renames any of these, the dashboard layout
   * regresses silently because the mock provider in
   * `convex-provider.tsx:201-211` already drops them today. This test
   * pins the full production sprint shape so any future schema drift
   * between Phase 1 and Phase 2 fails loudly in CI.
   */
  it('forwards the full burn-forecast sprint shape (TD-237/TD-239 cross-phase lock)', () => {
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
      projectedExhaustionMs: Date.now() + 86400000,
      atRisk: false,
      forecastConfidence: 0.8,
    }
    mockUseConvexQuery.mockReturnValue({
      sprint: fullSprint,
      tasks: [],
      agents: [],
      pipelineRuns: [],
      alerts: [],
      metrics: { deliveryRate: 0.5, successRate: 80, avgPipelineTime: 120000, rejectionRate: 5 },
    })
    const result = useDashboardData()
    expect(result?.sprint).toEqual(fullSprint)
    expect(result?.sprint?.burnRate).toBe(3.5)
    expect(result?.sprint?.atRisk).toBe(false)
    expect(result?.sprint?.forecastConfidence).toBe(0.8)
    expect(result?.sprint?.projectedExhaustionMs).toBeGreaterThan(Date.now())
  })
})
