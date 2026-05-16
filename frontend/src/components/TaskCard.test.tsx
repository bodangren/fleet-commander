import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { TaskCard } from '@/components/TaskCard'

describe('TaskCard', () => {
  const mockTask = {
    _id: 'task-1',
    title: 'Test Task',
    description: 'A test task description',
    status: 'ready',
    priority: 'high',
    projectId: 'proj-1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  it('renders title and description', () => {
    render(<TaskCard task={mockTask} onClick={vi.fn()} />)

    expect(screen.getByText('Test Task')).toBeInTheDocument()
    expect(screen.getByText('A test task description')).toBeInTheDocument()
  })

  it('displays assignee name when present', () => {
    const taskWithAssignee = { ...mockTask, assignee: 'emp-1' }
    render(<TaskCard task={taskWithAssignee} assigneeName="Alice Chen" onClick={vi.fn()} />)

    expect(screen.getByText('Alice Chen')).toBeInTheDocument()
  })

  it('shows unassigned label when no assignee', () => {
    render(<TaskCard task={mockTask} onClick={vi.fn()} />)

    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })

  it('displays priority badge', () => {
    render(<TaskCard task={mockTask} onClick={vi.fn()} />)

    expect(screen.getByText('high')).toBeInTheDocument()
  })

  it('is draggable', () => {
    render(<TaskCard task={mockTask} onClick={vi.fn()} />)

    expect(screen.getByRole('article')).toHaveAttribute('draggable', 'true')
  })

  it('calls onClick with task id when clicked', () => {
    const onClick = vi.fn()
    render(<TaskCard task={mockTask} onClick={onClick} />)

    fireEvent.click(screen.getByRole('article'))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith('task-1')
  })

  it('renders low priority with correct badge style', () => {
    const lowPriorityTask = { ...mockTask, priority: 'low' }
    render(<TaskCard task={lowPriorityTask} onClick={vi.fn()} />)

    expect(screen.getByText('low')).toBeInTheDocument()
  })
})
