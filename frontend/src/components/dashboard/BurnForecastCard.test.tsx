import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BurnForecastCard, type BurnForecastData } from './BurnForecastCard'
import { mockSprint, type MockSprint } from '@/__fixtures__/dashboardFixtures'

/**
 * Local fixture: mirrors `frontend/src/__fixtures__/dashboardFixtures.ts`
 * shape (mockSprint → burnForecast) without modifying the shared fixture
 * file. Kept inline so this Red-phase test addition stays within the
 * Red-phase boundary (test files + Measure docs only).
 */
const mockBurnForecast: BurnForecastData = {
  burnRatePerHour: 3.5,
  projectedExhaustionMs: Date.now() + 86400000,
  remainingBudget: 49.5,
  confidence: 0.8,
  dataPoints: 8,
  atRisk: false,
  sprintBudget: 500,
  currentSpend: 450.5,
}

/**
 * Reproduces the parent (DashboardPage) projection from a MockSprint to a
 * BurnForecastData. Mirrors `DashboardPage.tsx:27-38` so the test surface is
 * the same shape the production layout test exercises.
 */
function projectSprintToForecast(
  sprint: MockSprint,
  overrides: Partial<BurnForecastData> = {},
): BurnForecastData {
  return {
    burnRatePerHour: sprint.burnRate,
    projectedExhaustionMs: sprint.projectedExhaustionMs,
    remainingBudget: sprint.budget - sprint.actualCost,
    confidence: sprint.forecastConfidence,
    dataPoints: sprint.completedCount,
    atRisk: sprint.atRisk,
    sprintBudget: sprint.budget,
    currentSpend: sprint.actualCost,
    ...overrides,
  }
}

describe('BurnForecastCard', () => {
  it('renders the section heading', () => {
    render(<BurnForecastCard forecast={mockBurnForecast} />)
    expect(screen.getByText('Budget Burn Forecast')).toBeInTheDocument()
  })

  it('renders the burn rate formatted as currency per hour', () => {
    render(
      <BurnForecastCard
        forecast={projectSprintToForecast({ ...mockSprint, burnRate: 12.5 })}
      />,
    )
    expect(screen.getByText('$12.50')).toBeInTheDocument()
  })

  it('renders N/A for time remaining when projectedExhaustionMs is null', () => {
    render(
      <BurnForecastCard
        forecast={projectSprintToForecast({ ...mockSprint, projectedExhaustionMs: null })}
      />,
    )
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('renders the At Risk badge when atRisk is true', () => {
    render(
      <BurnForecastCard
        forecast={projectSprintToForecast({ ...mockSprint, atRisk: true })}
      />,
    )
    expect(screen.getByText('At Risk')).toBeInTheDocument()
  })

  it('does not render the At Risk badge when atRisk is false', () => {
    render(<BurnForecastCard forecast={projectSprintToForecast(mockSprint)} />)
    expect(screen.queryByText('At Risk')).not.toBeInTheDocument()
  })

  it('renders forecast confidence as a percentage', () => {
    render(
      <BurnForecastCard
        forecast={projectSprintToForecast({ ...mockSprint, forecastConfidence: 0.85 })}
      />,
    )
    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('renders plural "tasks" when dataPoints is not 1', () => {
    render(
      <BurnForecastCard
        forecast={projectSprintToForecast({ ...mockSprint, completedCount: 8 })}
      />,
    )
    expect(screen.getByText(/Based on 8 completed tasks/)).toBeInTheDocument()
  })

  it('renders singular "task" when dataPoints is exactly 1', () => {
    render(
      <BurnForecastCard
        forecast={projectSprintToForecast({ ...mockSprint, completedCount: 1 })}
      />,
    )
    expect(screen.getByText(/Based on 1 completed task\b/)).toBeInTheDocument()
  })

  it('renders the spend percent and remaining budget', () => {
    render(
      <BurnForecastCard
        forecast={projectSprintToForecast({ ...mockSprint, budget: 500, actualCost: 100 })}
      />,
    )
    expect(screen.getByText(/20% spent/)).toBeInTheDocument()
    expect(screen.getByText('$400.00 remaining')).toBeInTheDocument()
  })

  /**
   * TD-239 repro: simulate the upstream mock-provider mapping in
   * `__fixtures__/convex-provider.tsx` (which currently drops
   * burnRate/projectedExhaustionMs/atRisk/forecastConfidence from the
   * dashboardSprint → sprint projection). When that mapping is wrong, the
   * parent (DashboardPage) forwards `undefined` for `burnRatePerHour`, and
   * the component calls `formatCurrency(undefined)` which throws
   * `TypeError: Cannot read properties of undefined (reading 'toFixed')`.
   *
   * The component should be defensive (test-strategy §1 row 2:
   * "prefer fixing the component if behavior is wrong") and render without
   * crashing. This test is the Red-phase lock for that contract.
   */
  it('does not crash when upstream data drops required fields (TD-239 repro)', () => {
    const brokenForecast = {
      burnRatePerHour: undefined,
      projectedExhaustionMs: undefined,
      remainingBudget: undefined,
      confidence: undefined,
      dataPoints: undefined,
      atRisk: undefined,
      sprintBudget: undefined,
      currentSpend: undefined,
    } as unknown as BurnForecastData
    expect(() => render(<BurnForecastCard forecast={brokenForecast} />)).not.toThrow()
  })
})
