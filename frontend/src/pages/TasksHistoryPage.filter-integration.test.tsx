import { describe, expect, it, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import {
  setupConvexMocks,
  setMockConvexData,
  resetMockConvexData,
} from '@/__fixtures__/convex-provider'
import { mockTaskHistory } from '@/__fixtures__/historyFixtures'

setupConvexMocks()

import { TasksHistoryPage } from './TasksHistoryPage'

afterEach(() => {
  resetMockConvexData()
})

function renderWithRouter(ui: React.ReactNode, initialEntries?: string[]) {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={initialEntries}
    >
      {ui}
    </MemoryRouter>,
  )
}

describe('TasksHistoryPage filter integration', () => {
  it('reads search filter from URL and renders matching tasks', async () => {
    setMockConvexData({ taskHistory: mockTaskHistory })
    renderWithRouter(<TasksHistoryPage />, ['?search=auth'])

    await waitFor(() => {
      expect(screen.getByText('Fix auth bug')).toBeInTheDocument()
      expect(screen.queryByText('Add dashboard chart')).not.toBeInTheDocument()
    })
  })

  it('reads status filter from URL and renders matching tasks', async () => {
    setMockConvexData({ taskHistory: mockTaskHistory })
    renderWithRouter(<TasksHistoryPage />, ['?status=done'])

    await waitFor(() => {
      expect(screen.getByText('Fix auth bug')).toBeInTheDocument()
      expect(screen.queryByText('Optimize queries')).not.toBeInTheDocument()
    })
  })

  it('reads combined filters from URL', async () => {
    setMockConvexData({ taskHistory: mockTaskHistory })
    renderWithRouter(<TasksHistoryPage />, ['?search=Fix&status=done'])

    await waitFor(() => {
      expect(screen.getByText('Fix auth bug')).toBeInTheDocument()
      expect(screen.queryByText('Add dashboard chart')).not.toBeInTheDocument()
      expect(screen.queryByText('Optimize queries')).not.toBeInTheDocument()
    })
  })
})
