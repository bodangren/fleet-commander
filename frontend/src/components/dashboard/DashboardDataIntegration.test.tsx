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

import { DashboardDataIntegration } from './DashboardDataIntegration'

afterEach(() => {
  resetMockConvexData()
})

describe('DashboardDataIntegration', () => {
  it('shows loading skeleton when all dashboard data is undefined', () => {
    setMockConvexData({})
    render(<DashboardDataIntegration />)

    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument()
  })

  it('renders sprint status when dashboard sprint data is available', () => {
    setMockConvexData({ dashboardSprint: mockSprint })
    render(<DashboardDataIntegration />)

    expect(screen.getByText('Sprint 42')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('renders key metrics when dashboard metrics data is available', () => {
    setMockConvexData({ dashboardMetrics: mockKeyMetrics })
    render(<DashboardDataIntegration />)

    expect(screen.getByText('Delivery Rate')).toBeInTheDocument()
    expect(screen.getByText('Success Rate')).toBeInTheDocument()
    expect(screen.getByText('Pipeline Time')).toBeInTheDocument()
    expect(screen.getByText('Rejection Rate')).toBeInTheDocument()
  })

  it('renders agent status when dashboard agents data is available', () => {
    setMockConvexData({ dashboardAgents: mockAgents })
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DashboardDataIntegration />
      </MemoryRouter>,
    )

    expect(screen.getByText('Architect')).toBeInTheDocument()
    expect(screen.getByText('Executor')).toBeInTheDocument()
    expect(screen.getByText('Reviewer')).toBeInTheDocument()
  })

  it('renders attention items when dashboard alerts data is available', () => {
    setMockConvexData({ dashboardAlerts: mockAlerts })
    render(<DashboardDataIntegration />)

    expect(screen.getByText('Budget exceeded by 20%')).toBeInTheDocument()
    expect(screen.getByText('Agent idle for 30min')).toBeInTheDocument()
  })

  it('renders recent activity when dashboard activity data is available', () => {
    setMockConvexData({ dashboardActivity: mockActivity })
    render(<DashboardDataIntegration />)

    expect(screen.getByText('Fix auth bug')).toBeInTheDocument()
    expect(screen.getByText('Plan dashboard')).toBeInTheDocument()
    expect(screen.getByText('Review PR #1')).toBeInTheDocument()
  })

  it('renders all sections together when all data is available', () => {
    setMockConvexData({
      dashboardSprint: mockSprint,
      dashboardMetrics: mockKeyMetrics,
      dashboardAgents: mockAgents,
      dashboardAlerts: mockAlerts,
      dashboardActivity: mockActivity,
    })
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DashboardDataIntegration />
      </MemoryRouter>,
    )

    expect(screen.getByText('Sprint 42')).toBeInTheDocument()
    expect(screen.getByText('Delivery Rate')).toBeInTheDocument()
    expect(screen.getByText('Architect')).toBeInTheDocument()
    expect(screen.getByText('Budget exceeded by 20%')).toBeInTheDocument()
    expect(screen.getByText('Fix auth bug')).toBeInTheDocument()
  })

  it('updates DOM in realtime when Convex data changes', () => {
    setMockConvexData({
      dashboardSprint: mockSprint,
    })
    const { rerender } = render(<DashboardDataIntegration />)

    expect(screen.getByText('Sprint 42')).toBeInTheDocument()

    setMockConvexData({
      dashboardSprint: { ...mockSprint, name: 'Sprint 43' },
    })
    rerender(<DashboardDataIntegration />)

    expect(screen.getByText('Sprint 43')).toBeInTheDocument()
  })

  it('shows section-level skeletons when some dashboard data is still loading', () => {
    setMockConvexData({
      dashboardSprint: mockSprint,
      dashboardMetrics: undefined,
      dashboardAgents: undefined,
      dashboardAlerts: undefined,
      dashboardActivity: undefined,
    })
    render(<DashboardDataIntegration />)

    expect(screen.getByText('Sprint 42')).toBeInTheDocument()
    expect(screen.getAllByTestId('section-skeleton').length).toBeGreaterThanOrEqual(1)
  })
})
