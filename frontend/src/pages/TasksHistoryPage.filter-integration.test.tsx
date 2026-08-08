import { describe, expect, it, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, useSearchParams } from 'react-router-dom'

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

function LocationProbe() {
  const [searchParams] = useSearchParams()
  return <output data-testid="history-query">{searchParams.toString()}</output>
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

  it('preserves the selected status when search changes through the routed page', async () => {
    setMockConvexData({ taskHistory: mockTaskHistory })
    renderWithRouter(
      <>
        <TasksHistoryPage />
        <LocationProbe />
      </>,
      ['/history/tasks'],
    )

    fireEvent.change(screen.getByRole('combobox', { name: /status/i }), {
      target: { value: 'backlog' },
    })
    fireEvent.change(screen.getByPlaceholderText(/search tasks/i), {
      target: { value: 'dashboard' },
    })

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /status/i })).toHaveValue('backlog')
      expect(screen.getByTestId('history-query')).toHaveTextContent(
        'status=backlog&search=dashboard',
      )
    })
  })
})
