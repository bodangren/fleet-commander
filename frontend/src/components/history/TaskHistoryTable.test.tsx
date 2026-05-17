import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { TaskHistoryTable } from './TaskHistoryTable'
import { mockTaskHistory } from '@/__fixtures__/historyFixtures'

describe('TaskHistoryTable', () => {
  it('renders task titles and status in rows', () => {
    render(<TaskHistoryTable tasks={mockTaskHistory} />)

    expect(screen.getByText('Fix auth bug')).toBeInTheDocument()
    expect(screen.getByText('Add dashboard chart')).toBeInTheDocument()
    expect(screen.getByText('Optimize queries')).toBeInTheDocument()
    expect(screen.getByText('done')).toBeInTheDocument()
    expect(screen.getByText('in_progress')).toBeInTheDocument()
  })

  it('shows empty state when no tasks are provided', () => {
    render(<TaskHistoryTable tasks={[]} />)

    expect(screen.getByText('No tasks found')).toBeInTheDocument()
  })

  it('sorts by title when header is clicked', () => {
    render(<TaskHistoryTable tasks={mockTaskHistory} />)

    const titleHeader = screen.getByRole('columnheader', { name: /title/i })
    fireEvent.click(titleHeader)

    const rows = screen.getAllByRole('row')
    // First data row should be 'Add dashboard chart' after ascending sort
    expect(rows[1]).toHaveTextContent('Add dashboard chart')
  })

  it('calls onSelectTask when a row is clicked', () => {
    const handleSelect = vi.fn()
    render(<TaskHistoryTable tasks={mockTaskHistory} onSelectTask={handleSelect} />)

    const row = screen.getByText('Fix auth bug').closest('tr') ?? screen.getByText('Fix auth bug')
    fireEvent.click(row)

    expect(handleSelect).toHaveBeenCalledTimes(1)
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'task-history-1', title: 'Fix auth bug' }),
    )
  })

  it('renders cost values with two decimal places', () => {
    render(<TaskHistoryTable tasks={mockTaskHistory} />)

    expect(screen.getByText('12.50')).toBeInTheDocument()
    expect(screen.getByText('18.75')).toBeInTheDocument()
  })

  it('renders story points for each task', () => {
    render(<TaskHistoryTable tasks={mockTaskHistory} />)

    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders agent name and project slug for each task', () => {
    render(<TaskHistoryTable tasks={mockTaskHistory} />)

    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('bob')).toBeInTheDocument()
    expect(screen.getByText('foundation')).toBeInTheDocument()
  })
})
