import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import {
  setupConvexMocks,
  setMockConvexData,
  resetMockConvexData,
} from '@/__fixtures__/convex-provider'

import {
  mockSprint,
  mockAgents,
  mockActivity,
  mockAlerts,
  mockKeyMetrics,
} from '@/__fixtures__/dashboardFixtures'

setupConvexMocks()

import { DashboardPage } from './DashboardPage'

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

afterEach(() => {
  resetMockConvexData()
})

describe('DashboardPage layout', () => {
  it('renders all 5 dashboard sections when data is available', () => {
    setMockConvexData({
      dashboardSprint: mockSprint,
      dashboardMetrics: mockKeyMetrics,
      dashboardAgents: mockAgents,
      dashboardAlerts: mockAlerts,
      dashboardActivity: mockActivity,
    })
    renderWithRouter(<DashboardPage />)

    expect(screen.getByText('Sprint 42')).toBeInTheDocument()
    expect(screen.getByText('Delivery Rate')).toBeInTheDocument()
    expect(screen.getAllByText('@architect').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Budget exceeded by 20%')).toBeInTheDocument()
    expect(screen.getByText(/Fix auth bug/)).toBeInTheDocument()
  })

  it('arranges sections in a grid layout container', () => {
    setMockConvexData({
      dashboardSprint: mockSprint,
      dashboardMetrics: mockKeyMetrics,
      dashboardAgents: mockAgents,
      dashboardAlerts: mockAlerts,
      dashboardActivity: mockActivity,
    })
    const { container } = renderWithRouter(<DashboardPage />)

    const grids = container.querySelectorAll('[data-testid="dashboard-grid"]')
    expect(grids.length).toBe(2)
  })

  it('shows loading state when dashboard data is still loading', () => {
    setMockConvexData({})
    renderWithRouter(<DashboardPage />)

    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument()
  })

  it('renders responsive grid classes on the layout container', () => {
    setMockConvexData({
      dashboardSprint: mockSprint,
      dashboardMetrics: mockKeyMetrics,
      dashboardAgents: mockAgents,
      dashboardAlerts: mockAlerts,
      dashboardActivity: mockActivity,
    })
    const { container } = renderWithRouter(<DashboardPage />)

    const grid = container.querySelector('[data-testid="dashboard-grid"]')
    expect(grid).toBeInTheDocument()
    expect(grid).toHaveClass('md:grid-cols-2')
  })

  /**
   * TD-239 chain lock (Red phase): the full layout must render the burn
   * forecast value from `mockSprint.burnRate = 3.5` as `$3.50`. This is
   * the end-to-end assertion the three "crashes during render" tests
   * above don't make — they bail out before they can check that the
   * post-Green chain actually forwards the data. Today the chain crashes
   * at `formatCurrency(undefined)` because the mock provider in
   * `convex-provider.tsx:201-211` drops `burnRate` from the response; the
   * component is also non-defensive at `BurnForecastCard.tsx:81`. After
   * the Green-phase fix (mock provider mapping + component guard), this
   * test will pass and lock the chain contract.
   */
  it('renders the burn forecast rate from sprint data (TD-239 chain lock)', () => {
    setMockConvexData({
      dashboardSprint: mockSprint,
      dashboardMetrics: mockKeyMetrics,
      dashboardAgents: mockAgents,
      dashboardAlerts: mockAlerts,
      dashboardActivity: mockActivity,
    })
    renderWithRouter(<DashboardPage />)
    expect(screen.getByText('$3.50')).toBeInTheDocument()
  })
})
