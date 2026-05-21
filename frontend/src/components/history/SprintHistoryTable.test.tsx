import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { SprintHistoryTable } from './SprintHistoryTable'
import { mockSprintHistory } from '@/__fixtures__/historyFixtures'

describe('SprintHistoryTable', () => {
  it('renders sprint names and status in rows', () => {
    render(<SprintHistoryTable sprints={mockSprintHistory} />)

    expect(screen.getByText('Sprint 1')).toBeInTheDocument()
    expect(screen.getByText('Sprint 2')).toBeInTheDocument()
    expect(screen.getByText('Sprint 3')).toBeInTheDocument()
    expect(screen.getAllByText('closed').length).toBeGreaterThan(0)
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('shows empty state when no sprints are provided', () => {
    render(<SprintHistoryTable sprints={[]} />)

    expect(screen.getByText('No sprints found')).toBeInTheDocument()
  })

  it('sorts by name when header is clicked', () => {
    render(<SprintHistoryTable sprints={mockSprintHistory} />)

    const nameHeader = screen.getByRole('columnheader', { name: /name/i })
    fireEvent.click(nameHeader)

    const rows = screen.getAllByRole('row')
    // First data row should be Sprint 1 after ascending sort (initial state is unsorted)
    expect(rows[1]).toHaveTextContent('Sprint 1')
  })

  it('calls onSelectSprint when a row is clicked', () => {
    const handleSelect = vi.fn()
    render(<SprintHistoryTable sprints={mockSprintHistory} onSelectSprint={handleSelect} />)

    const row = screen.getByText('Sprint 2').closest('tr') ?? screen.getByText('Sprint 2')
    fireEvent.click(row)

    expect(handleSelect).toHaveBeenCalledTimes(1)
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'sprint-2', name: 'Sprint 2' }),
    )
  })

  it('renders cost values with two decimal places', () => {
    render(<SprintHistoryTable sprints={mockSprintHistory} />)

    expect(screen.getByText('487.33')).toBeInTheDocument()
    expect(screen.getByText('523.75')).toBeInTheDocument()
  })

  it('renders velocity for each sprint', () => {
    render(<SprintHistoryTable sprints={mockSprintHistory} />)

    expect(screen.getAllByText('1.71').length).toBeGreaterThan(0)
    expect(screen.getByText('2.00')).toBeInTheDocument()
  })
})
