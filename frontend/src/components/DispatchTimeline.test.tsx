import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { DispatchTimeline, DispatchTimelineData } from './DispatchTimeline'

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('DispatchTimeline', () => {
  const mockData: DispatchTimelineData = {
    entries: [
      {
        taskId: 'task-101',
        projectSlug: 'kanban-conductor',
        objective: 'Fix coverage parser',
        createdAt: 1713292800000,
        hasArchitect: true,
        hasExecutor: true,
        hasReviewer: false,
        hasRecovery: false,
        rejectionCount: 0,
      },
      {
        taskId: 'task-102',
        projectSlug: 'fleet-commander',
        objective: 'Add retry logic',
        createdAt: 1713206400000,
        hasArchitect: false,
        hasExecutor: false,
        hasReviewer: false,
        hasRecovery: true,
        rejectionCount: 2,
      },
    ],
  }

  it('renders timeline entries with objectives', () => {
    renderWithRouter(<DispatchTimeline data={mockData} />)

    expect(screen.getByText('Fix coverage parser')).toBeInTheDocument()
    expect(screen.getByText('Add retry logic')).toBeInTheDocument()
  })

  it('renders stage badges for completed stages', () => {
    renderWithRouter(<DispatchTimeline data={mockData} />)

    const row101 = screen.getByTestId('timeline-row-task-101')
    expect(row101).toHaveTextContent('A')
    expect(row101).toHaveTextContent('E')

    const row102 = screen.getByTestId('timeline-row-task-102')
    expect(row102).toHaveTextContent('X')
  })

  it('renders rejection counts', () => {
    renderWithRouter(<DispatchTimeline data={mockData} />)

    expect(screen.getByText('2 rejections')).toBeInTheDocument()
  })

  it('renders links to task timeline pages', () => {
    renderWithRouter(<DispatchTimeline data={mockData} />)

    const link101 = screen.getByTestId('timeline-link-task-101')
    expect(link101).toHaveAttribute('href', '/tasks/task-101/timeline')

    const link102 = screen.getByTestId('timeline-link-task-102')
    expect(link102).toHaveAttribute('href', '/tasks/task-102/timeline')
  })

  it('renders empty state when no entries', () => {
    renderWithRouter(<DispatchTimeline data={{ entries: [] }} />)

    expect(screen.getByText('No run contracts found')).toBeInTheDocument()
  })

  it('renders loading state', () => {
    renderWithRouter(<DispatchTimeline data={undefined} loading />)

    expect(screen.getByText('Loading dispatch timeline...')).toBeInTheDocument()
  })
})
