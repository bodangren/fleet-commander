import { describe, expect, it, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom'

import {
  setupConvexMocks,
  setMockConvexData,
  resetMockConvexData,
} from '@/__fixtures__/convex-provider'
import { mockTaskHistory } from '@/__fixtures__/historyFixtures'
import type { FleetDataState } from '@/lib/useFleetData'

setupConvexMocks()

import { TasksHistoryPage } from './TasksHistoryPage'

afterEach(() => {
  resetMockConvexData()
})

const fleetContext = {
  healthStatus: 'Backend Status: ok',
  projects: [
    {
      id: 'project-reading-advantage',
      slug: 'reading-advantage-llm-benchmark',
      name: 'Reading Advantage LLM Benchmark',
      path: '/workspace/reading-advantage-llm-benchmark',
      tracks: [],
      lastUpdated: 0,
    },
  ],
  agents: [],
  harnesses: [],
  loading: false,
  error: null,
  refresh: async () => {},
  busyAgent: null,
  busyHarness: null,
  agentTestResult: null,
  harnessDiscoveryResult: null,
  testAgent: async () => {},
  testHarnessDiscovery: async () => {},
} satisfies FleetDataState

function renderWithRouter(ui: React.ReactNode) {
  const router = createMemoryRouter(
    [
      {
        element: <Outlet context={fleetContext} />,
        children: [{ index: true, element: ui }],
      },
    ],
    { initialEntries: ['/'] },
  )
  return render(<RouterProvider router={router} />)
}

describe('TasksHistoryPage', () => {
  it('renders the page title', () => {
    setMockConvexData({ taskHistory: mockTaskHistory })
    renderWithRouter(<TasksHistoryPage />)

    expect(screen.getByText('Task History')).toBeInTheDocument()
  })

  it('renders the task history table with data from hook', () => {
    setMockConvexData({ taskHistory: mockTaskHistory })
    renderWithRouter(<TasksHistoryPage />)

    expect(screen.getByText('Fix auth bug')).toBeInTheDocument()
    expect(screen.getByText('Add dashboard chart')).toBeInTheDocument()
    expect(screen.getByText('Optimize queries')).toBeInTheDocument()
  })

  it('renders search input for task list', () => {
    setMockConvexData({ taskHistory: mockTaskHistory })
    renderWithRouter(<TasksHistoryPage />)

    expect(screen.getByPlaceholderText(/search tasks/i)).toBeInTheDocument()
  })

  it('renders the shared Project selector with the Agent and Status filters', () => {
    setMockConvexData({ taskHistory: mockTaskHistory })
    renderWithRouter(<TasksHistoryPage />)

    expect(screen.getByRole('combobox', { name: 'Project' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /agent/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument()
  })

  it('offers only canonical backend status values', () => {
    setMockConvexData({ taskHistory: mockTaskHistory })
    renderWithRouter(<TasksHistoryPage />)

    const statusSelect = screen.getByRole('combobox', { name: /status/i })
    const statusValues = Array.from(statusSelect.querySelectorAll('option'))
      .map(option => option.value)
      .filter(Boolean)

    expect(statusValues).toEqual(['backlog', 'ready', 'in_progress', 'review', 'done', 'blocked'])
    expect(statusValues).not.toContain('todo')
  })

  it('filters tasks by search query', async () => {
    setMockConvexData({ taskHistory: mockTaskHistory })
    renderWithRouter(<TasksHistoryPage />)

    const searchInput = screen.getByPlaceholderText(/search tasks/i)
    fireEvent.change(searchInput, { target: { value: 'auth' } })

    await waitFor(() => {
      expect(screen.getByText('Fix auth bug')).toBeInTheDocument()
      expect(screen.queryByText('Add dashboard chart')).not.toBeInTheDocument()
    })
  })

  it('filters tasks by status dropdown', async () => {
    setMockConvexData({ taskHistory: mockTaskHistory })
    renderWithRouter(<TasksHistoryPage />)

    const statusSelect = screen.getByLabelText(/status/i)
    fireEvent.change(statusSelect, { target: { value: 'done' } })

    await waitFor(() => {
      expect(screen.getByText('Fix auth bug')).toBeInTheDocument()
      expect(screen.queryByText('Optimize queries')).not.toBeInTheDocument()
    })
  })

  it('drills down to task detail when a table row is clicked', async () => {
    setMockConvexData({ taskHistory: mockTaskHistory })
    renderWithRouter(<TasksHistoryPage />)

    const row = screen.getByText('Fix auth bug').closest('tr') ?? screen.getByText('Fix auth bug')
    fireEvent.click(row)

    await waitFor(() => {
      expect(screen.getByText(/cost/i)).toBeInTheDocument()
      expect(screen.getByText('12.50')).toBeInTheDocument()
    })
  })

  it('shows empty state when no task history exists', () => {
    setMockConvexData({ taskHistory: [] })
    renderWithRouter(<TasksHistoryPage />)

    expect(screen.getByText('No task history')).toBeInTheDocument()
  })

  it('shows loading state while task history is loading', () => {
    setMockConvexData({ taskHistory: undefined })
    renderWithRouter(<TasksHistoryPage />)

    expect(screen.getByText('Loading task history…')).toBeInTheDocument()
  })
})
