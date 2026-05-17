import { describe, expect, it, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import {
  setupConvexMocks,
  setMockConvexData,
  resetMockConvexData,
} from '@/__fixtures__/convex-provider'
import {
  mockInsightSprints,
  mockSingleInsightSprint,
  mockLargeInsightSprints,
} from '@/__fixtures__/insightsFixtures'
import { mockSprintHistory } from '@/__fixtures__/historyFixtures'

setupConvexMocks()

import { AnalyticsPage } from './AnalyticsPage'

afterEach(() => {
  resetMockConvexData()
})

function renderWithRouter(ui: React.ReactElement) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {ui}
    </MemoryRouter>,
  )
}

describe('AnalyticsPage', () => {
  it('renders the page title and subtitle', () => {
    setMockConvexData({ sprintHistory: mockSprintHistory })
    renderWithRouter(<AnalyticsPage />)

    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(
      screen.getByText(/Sprint velocity, cost efficiency, and delivery metrics/i),
    ).toBeInTheDocument()
  })

  it('renders the stats summary row', () => {
    setMockConvexData({ sprintHistory: mockSprintHistory })
    renderWithRouter(<AnalyticsPage />)

    expect(screen.getByText(/Avg Cost\/Point/i)).toBeInTheDocument()
    expect(screen.getByText(/Points per Dollar/i)).toBeInTheDocument()
    expect(screen.getByText(/Sprint Velocity/i)).toBeInTheDocument()
    expect(screen.getByText(/Budget Accuracy/i)).toBeInTheDocument()
  })

  it('renders the sprint velocity chart', () => {
    setMockConvexData({ sprintHistory: mockSprintHistory })
    renderWithRouter(<AnalyticsPage />)

    expect(screen.getByText(/Velocity Trend/i)).toBeInTheDocument()
    expect(screen.getByText(/Points delivered/i)).toBeInTheDocument()
    expect(screen.getByText(/Cost per point/i)).toBeInTheDocument()
  })

  it('renders the budget utilization chart', () => {
    setMockConvexData({ sprintHistory: mockSprintHistory })
    renderWithRouter(<AnalyticsPage />)

    expect(screen.getByText(/Budget Utilization/i)).toBeInTheDocument()
    expect(screen.getByText(/Estimated/i)).toBeInTheDocument()
    expect(screen.getByText(/Actual/i)).toBeInTheDocument()
  })

  it('renders the sprint history table with cost accuracy', () => {
    setMockConvexData({ sprintHistory: mockSprintHistory })
    renderWithRouter(<AnalyticsPage />)

    expect(screen.getByText(/Sprint History/i)).toBeInTheDocument()
    expect(screen.getByText(/Sprint/i)).toBeInTheDocument()
    expect(screen.getByText(/Points/i)).toBeInTheDocument()
    expect(screen.getByText(/Tasks/i)).toBeInTheDocument()
    expect(screen.getByText(/Budget/i)).toBeInTheDocument()
    expect(screen.getByText(/Actual Cost/i)).toBeInTheDocument()
    expect(screen.getByText(/Cost\/Point/i)).toBeInTheDocument()
    expect(screen.getByText(/Accuracy/i)).toBeInTheDocument()
  })

  it('populates the table with sprint data from the hook', () => {
    setMockConvexData({ sprintHistory: mockSprintHistory })
    renderWithRouter(<AnalyticsPage />)

    expect(screen.getByText('Sprint 1')).toBeInTheDocument()
    expect(screen.getByText('Sprint 2')).toBeInTheDocument()
    expect(screen.getByText('Sprint 3')).toBeInTheDocument()
  })

  it('shows empty state when no sprint history exists', () => {
    setMockConvexData({ sprintHistory: [] })
    renderWithRouter(<AnalyticsPage />)

    expect(screen.getByText(/No sprint history/i)).toBeInTheDocument()
  })

  it('shows loading state while sprint history is loading', () => {
    setMockConvexData({ sprintHistory: undefined })
    renderWithRouter(<AnalyticsPage />)

    expect(screen.getByText(/Loading analytics/i)).toBeInTheDocument()
  })

  it('renders correctly with a single sprint', () => {
    setMockConvexData({ sprintHistory: mockSingleInsightSprint })
    renderWithRouter(<AnalyticsPage />)

    expect(screen.getByText('Sprint 1')).toBeInTheDocument()
    expect(screen.getByText(/Velocity Trend/i)).toBeInTheDocument()
    expect(screen.getByText(/Budget Utilization/i)).toBeInTheDocument()
  })

  it('handles large datasets without crashing', () => {
    setMockConvexData({ sprintHistory: mockLargeInsightSprints })
    renderWithRouter(<AnalyticsPage />)

    expect(screen.getByText('Sprint 55')).toBeInTheDocument()
    expect(screen.getByText(/Velocity Trend/i)).toBeInTheDocument()
    expect(screen.getByText(/Sprint History/i)).toBeInTheDocument()
  })

  it('does not render Infinity or NaN when pointsDelivered is zero', () => {
    const zeroPointSprint = [
      {
        _id: 'sprint-zero',
        name: 'Sprint Zero',
        status: 'closed' as const,
        startDate: Date.now() - 1000 * 60 * 60 * 24 * 14,
        endDate: Date.now() - 1000 * 60 * 60 * 24 * 1,
        budget: 100,
        actualCost: 0,
        pointsDelivered: 0,
        pointsEstimated: 10,
        taskCount: 0,
        completedCount: 0,
        velocity: 0,
      },
    ]
    setMockConvexData({ sprintHistory: zeroPointSprint })
    renderWithRouter(<AnalyticsPage />)

    expect(screen.queryByText('Infinity')).not.toBeInTheDocument()
    expect(screen.queryByText('NaN')).not.toBeInTheDocument()
    expect(screen.getByText(/Sprint Zero/i)).toBeInTheDocument()
  })
})
