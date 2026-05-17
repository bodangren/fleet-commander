import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

import type { FleetDataState } from '@/lib/useFleetData'

vi.mock('@/components/FleetStatusWidget', () => ({
  FleetStatusWidget: function FleetStatusWidget() {
    return null
  },
}))

setupConvexMocks()

import { DashboardPage } from './DashboardPage'

const fleet = {
  healthStatus: 'Backend Status: ok',
  projects: [
    {
      id: 'demo-project',
      name: 'Demo Project',
      path: '/tmp/demo-project',
      tracks: [],
      lastUpdated: Date.now(),
    },
  ],
  agents: [],
  harnesses: [],
  loading: false,
  error: null,
  refresh: vi.fn(async () => {}),
  busyAgent: null,
  busyHarness: null,
  agentTestResult: null,
  harnessDiscoveryResult: null,
  testAgent: vi.fn(async () => {}),
  testHarnessDiscovery: vi.fn(async () => {}),
} satisfies FleetDataState

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
    renderWithRouter(<DashboardPage fleet={fleet} lines={[]} connected={false} />)

    // Sprint Status
    expect(screen.getByText('Sprint 42')).toBeInTheDocument()
    // Key Metrics
    expect(screen.getByText('Delivery Rate')).toBeInTheDocument()
    // Agent Status
    expect(screen.getByText('Architect')).toBeInTheDocument()
    // Attention Needed
    expect(screen.getByText('Budget exceeded by 20%')).toBeInTheDocument()
    // Recent Activity
    expect(screen.getByText('Fix auth bug')).toBeInTheDocument()
  })

  it('arranges sections in a grid layout container', () => {
    setMockConvexData({
      dashboardSprint: mockSprint,
      dashboardMetrics: mockKeyMetrics,
      dashboardAgents: mockAgents,
      dashboardAlerts: mockAlerts,
      dashboardActivity: mockActivity,
    })
    const { container } = renderWithRouter(
      <DashboardPage fleet={fleet} lines={[]} connected={false} />,
    )

    const grid = container.querySelector('[data-testid="dashboard-grid"]')
    expect(grid).toBeInTheDocument()
    expect(grid).toHaveClass('grid')
  })

  it('shows loading skeleton when dashboard data is still loading', () => {
    setMockConvexData({})
    renderWithRouter(<DashboardPage fleet={fleet} lines={[]} connected={false} />)

    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument()
  })

  it('preserves onboarding flow when no projects exist', () => {
    const emptyFleet = { ...fleet, projects: [] }
    renderWithRouter(<DashboardPage fleet={emptyFleet} lines={[]} connected={false} />)

    expect(screen.getByText('Bring a workspace into Fleet Commander.')).toBeInTheDocument()
    expect(screen.getByLabelText('Workspace Root')).toBeInTheDocument()
  })

  it('renders responsive grid classes on the layout container', () => {
    setMockConvexData({
      dashboardSprint: mockSprint,
      dashboardMetrics: mockKeyMetrics,
      dashboardAgents: mockAgents,
      dashboardAlerts: mockAlerts,
      dashboardActivity: mockActivity,
    })
    const { container } = renderWithRouter(
      <DashboardPage fleet={fleet} lines={[]} connected={false} />,
    )

    const grid = container.querySelector('[data-testid="dashboard-grid"]')
    expect(grid).toBeInTheDocument()
    // Responsive breakpoint classes should be present
    expect(grid).toHaveClass('md:grid-cols-2')
  })
})
