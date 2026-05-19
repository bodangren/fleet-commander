import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { TaskCard } from './TaskCard'
import type { KanbanTask } from '@/hooks/useKanbanBoard'

describe('TaskCard', () => {
  const mockTask: KanbanTask = {
    _id: 'task-1',
    projectId: 'proj-1',
    title: 'Build auth middleware',
    description: 'Implement JWT auth',
    storyPoints: 5,
    status: 'ready',
    priority: 'high',
    costEstimate: 21.0,
    actualCost: undefined,
    assigneeId: 'agent-1',
    assigneeName: 'alice',
    assigneeRole: 'architect',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  it('renders title', () => {
    render(<TaskCard task={mockTask} />)
    expect(screen.getByText('Build auth middleware')).toBeInTheDocument()
  })

  it('displays story points and estimated cost', () => {
    render(<TaskCard task={mockTask} />)
    expect(screen.getByText(/5 pts/)).toBeInTheDocument()
    expect(screen.getByText(/est. \$21\.00/)).toBeInTheDocument()
  })

  it('displays actual cost when available', () => {
    const task = { ...mockTask, actualCost: 18.5 }
    render(<TaskCard task={task} />)
    expect(screen.getByText(/\$18\.50/)).toBeInTheDocument()
  })

  it('shows assignee name', () => {
    render(<TaskCard task={mockTask} />)
    expect(screen.getByText('@alice')).toBeInTheDocument()
  })

  it('shows unassigned when no assignee', () => {
    const task = { ...mockTask, assigneeName: undefined }
    render(<TaskCard task={task} />)
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })

  it('displays priority badge', () => {
    render(<TaskCard task={mockTask} />)
    expect(screen.getByText('high')).toBeInTheDocument()
  })

  it('is draggable', () => {
    render(<TaskCard task={mockTask} />)
    expect(
      screen.getByText('Build auth middleware').closest('[draggable="true"]'),
    ).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<TaskCard task={mockTask} onClick={onClick} />)
    fireEvent.click(screen.getByText('Build auth middleware').closest('[draggable="true"]')!)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('shows blocked badge for blocked tasks', () => {
    const task = { ...mockTask, status: 'blocked' as const }
    render(<TaskCard task={task} />)
    expect(screen.getByText('BLOCKED')).toBeInTheDocument()
  })

  it('shows pipeline stage badge for in_progress', () => {
    const task = { ...mockTask, status: 'in_progress' as const }
    render(<TaskCard task={task} />)
    expect(screen.getByText('EXECUTE')).toBeInTheDocument()
  })

  it('shows reduced opacity for done tasks', () => {
    const task = { ...mockTask, status: 'done' as const }
    const { container } = render(<TaskCard task={task} />)
    expect(container.querySelector('.opacity-60')).toBeInTheDocument()
  })
})
