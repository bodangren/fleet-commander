import { describe, expect, it, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import {
  setupConvexMocks,
  setMockConvexData,
  resetMockConvexData,
} from '@/__fixtures__/convex-provider'
import { mockSprintHistory } from '@/__fixtures__/historyFixtures'

setupConvexMocks()

import { SprintsHistoryPage } from './SprintsHistoryPage'

afterEach(() => {
  resetMockConvexData()
})

function renderWithRouter(ui: React.ReactNode) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {ui}
    </MemoryRouter>,
  )
}

describe('SprintsHistoryPage', () => {
  it('renders the page title', () => {
    setMockConvexData({ sprintHistory: mockSprintHistory })
    renderWithRouter(<SprintsHistoryPage />)

    expect(screen.getByText('Sprint History')).toBeInTheDocument()
  })

  it('renders the sprint history table with data from hook', () => {
    setMockConvexData({ sprintHistory: mockSprintHistory })
    renderWithRouter(<SprintsHistoryPage />)

    expect(screen.getAllByText('Sprint 1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sprint 2').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sprint 3').length).toBeGreaterThan(0)
  })

  it('renders the velocity trend chart with data from hook', () => {
    setMockConvexData({ sprintHistory: mockSprintHistory })
    renderWithRouter(<SprintsHistoryPage />)

    expect(screen.getByText('Velocity Trend')).toBeInTheDocument()
  })

  it('drills down to sprint detail when a table row is clicked', async () => {
    setMockConvexData({ sprintHistory: mockSprintHistory })
    renderWithRouter(<SprintsHistoryPage />)

    const sprint2Cell = screen.getAllByText('Sprint 2')[0]
    const row = sprint2Cell.closest('tr') ?? sprint2Cell
    fireEvent.click(row)

    await waitFor(() => {
      expect(screen.getByText(/budget/i)).toBeInTheDocument()
      expect(screen.getByText('550')).toBeInTheDocument()
    })
  })

  it('shows empty state when no sprint history exists', () => {
    setMockConvexData({ sprintHistory: [] })
    renderWithRouter(<SprintsHistoryPage />)

    expect(screen.getByText('No sprint history')).toBeInTheDocument()
  })

  it('shows loading state while sprint history is loading', () => {
    setMockConvexData({ sprintHistory: undefined })
    renderWithRouter(<SprintsHistoryPage />)

    expect(screen.getByText('Loading sprint history…')).toBeInTheDocument()
  })
})
