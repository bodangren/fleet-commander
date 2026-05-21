import { describe, expect, it, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import {
  setupConvexMocks,
  setMockConvexData,
  resetMockConvexData,
} from '@/__fixtures__/convex-provider'
import { mockAgentHistory } from '@/__fixtures__/historyFixtures'

setupConvexMocks()

import { AgentsHistoryPage } from './AgentsHistoryPage'

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

describe('AgentsHistoryPage', () => {
  it('renders the page title', () => {
    setMockConvexData({ agentHistory: mockAgentHistory })
    renderWithRouter(<AgentsHistoryPage />)

    expect(screen.getByText('Agent History')).toBeInTheDocument()
  })

  it('renders the agent performance table with data from hook', () => {
    setMockConvexData({ agentHistory: mockAgentHistory })
    renderWithRouter(<AgentsHistoryPage />)

    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0)
  })

  it('renders the cost trend chart with data from hook', () => {
    setMockConvexData({ agentHistory: mockAgentHistory })
    renderWithRouter(<AgentsHistoryPage />)

    expect(screen.getByText('Cost Trend')).toBeInTheDocument()
  })

  it('shows empty state when no agent history exists', () => {
    setMockConvexData({ agentHistory: [] })
    renderWithRouter(<AgentsHistoryPage />)

    expect(screen.getByText('No agent history')).toBeInTheDocument()
  })

  it('shows loading state while agent history is loading', () => {
    setMockConvexData({ agentHistory: undefined })
    renderWithRouter(<AgentsHistoryPage />)

    expect(screen.getByText('Loading agent history…')).toBeInTheDocument()
  })
})
