import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { KanbanBoard } from './KanbanBoard'
import type { KanbanTask } from '@/hooks/useKanbanBoard'

describe('KanbanBoard', () => {
  const mockTasks: KanbanTask[] = [
    {
      _id: 't1',
      projectId: 'p1',
      title: 'Backlog task',
      description: '',
      storyPoints: 2,
      status: 'backlog',
      priority: 'low',
      costEstimate: 3.6,
      createdAt: 0,
      updatedAt: 0,
    },
    {
      _id: 't2',
      projectId: 'p1',
      title: 'Ready task',
      description: '',
      storyPoints: 3,
      status: 'ready',
      priority: 'medium',
      costEstimate: 6.3,
      createdAt: 0,
      updatedAt: 0,
    },
    {
      _id: 't3',
      projectId: 'p1',
      title: 'In progress task',
      description: '',
      storyPoints: 5,
      status: 'in_progress',
      priority: 'high',
      costEstimate: 21.0,
      createdAt: 0,
      updatedAt: 0,
    },
    {
      _id: 't4',
      projectId: 'p1',
      title: 'Review task',
      description: '',
      storyPoints: 3,
      status: 'review',
      priority: 'medium',
      costEstimate: 8.4,
      createdAt: 0,
      updatedAt: 0,
    },
    {
      _id: 't5',
      projectId: 'p1',
      title: 'Done task',
      description: '',
      storyPoints: 3,
      status: 'done',
      priority: 'low',
      costEstimate: 5.4,
      actualCost: 5.4,
      createdAt: 0,
      updatedAt: 0,
    },
  ]

  it('renders all 5 columns', () => {
    render(<KanbanBoard tasks={mockTasks} onMoveTask={vi.fn()} />)

    expect(screen.getByText('Backlog')).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('For Review')).toBeInTheDocument()
    expect(screen.getByText('Merged')).toBeInTheDocument()
  })

  it('groups tasks into correct columns', () => {
    render(<KanbanBoard tasks={mockTasks} onMoveTask={vi.fn()} />)

    expect(screen.getByText('Backlog task')).toBeInTheDocument()
    expect(screen.getByText('Ready task')).toBeInTheDocument()
    expect(screen.getByText('In progress task')).toBeInTheDocument()
    expect(screen.getByText('Review task')).toBeInTheDocument()
    expect(screen.getByText('Done task')).toBeInTheDocument()
  })

  it('shows correct task counts per column', () => {
    render(<KanbanBoard tasks={mockTasks} onMoveTask={vi.fn()} />)

    const counts = screen.getAllByText('1')
    expect(counts.length).toBe(5)
  })

  it('calls onMoveTask when task is dropped to another column', () => {
    const onMoveTask = vi.fn()
    render(<KanbanBoard tasks={mockTasks} onMoveTask={onMoveTask} />)

    const draggedCard = screen.getByText('Ready task').closest('[draggable="true"]')!
    const dropZone = document.querySelector('[data-column-key="in_progress"]')!

    const dataTransfer = {
      data: {} as Record<string, string>,
      setData(format: string, value: string) {
        this.data[format] = value
      },
      getData(format: string) {
        return this.data[format] ?? ''
      },
    } as DataTransfer

    fireEvent.dragStart(draggedCard, { dataTransfer })
    fireEvent.dragOver(dropZone, { dataTransfer })
    fireEvent.drop(dropZone, { dataTransfer })

    expect(onMoveTask).toHaveBeenCalledWith('t2', 'in_progress')
  })

  it('does not call onMoveTask for invalid transitions', () => {
    const onMoveTask = vi.fn()
    render(<KanbanBoard tasks={mockTasks} onMoveTask={onMoveTask} />)

    const draggedCard = screen.getByText('Done task').closest('[draggable="true"]')!
    const dropZone = document.querySelector('[data-column-key="backlog"]')!

    const dataTransfer = {
      data: {} as Record<string, string>,
      setData(format: string, value: string) {
        this.data[format] = value
      },
      getData(format: string) {
        return this.data[format] ?? ''
      },
    } as DataTransfer

    fireEvent.dragStart(draggedCard, { dataTransfer })
    fireEvent.dragOver(dropZone, { dataTransfer })
    fireEvent.drop(dropZone, { dataTransfer })

    expect(onMoveTask).not.toHaveBeenCalled()
  })
})
