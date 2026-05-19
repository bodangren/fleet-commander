import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { KanbanColumn, COLUMNS } from './KanbanColumn'
import type { KanbanTask } from '@/hooks/useKanbanBoard'

describe('KanbanColumn', () => {
  const column = COLUMNS[1] // Ready

  const mockTasks: KanbanTask[] = [
    {
      _id: 't1',
      projectId: 'p1',
      title: 'Task 1',
      description: 'Desc 1',
      storyPoints: 2,
      status: 'ready',
      priority: 'medium',
      costEstimate: 4.2,
      createdAt: 0,
      updatedAt: 0,
    },
  ]

  it('renders column title and count', () => {
    render(
      <KanbanColumn
        column={column}
        tasks={mockTasks}
        isDragOver={false}
        onDragOver={vi.fn()}
        onDragLeave={vi.fn()}
        onDrop={vi.fn()}
      >
        <div>Child</div>
      </KanbanColumn>,
    )

    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows empty state when no tasks', () => {
    render(
      <KanbanColumn
        column={column}
        tasks={[]}
        isDragOver={false}
        onDragOver={vi.fn()}
        onDragLeave={vi.fn()}
        onDrop={vi.fn()}
      >
        <div>No tasks</div>
      </KanbanColumn>,
    )

    expect(screen.getByText('No tasks')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('highlights when drag over', () => {
    const { container } = render(
      <KanbanColumn
        column={column}
        tasks={[]}
        isDragOver={true}
        onDragOver={vi.fn()}
        onDragLeave={vi.fn()}
        onDrop={vi.fn()}
      >
        <div>Child</div>
      </KanbanColumn>,
    )

    expect(container.querySelector('[data-column-key="ready"]')).toHaveClass('ring-1')
  })

  it('calls onDrop when task is dropped', () => {
    const onDrop = vi.fn()
    const onDragOver = vi.fn(e => e.preventDefault())

    render(
      <KanbanColumn
        column={column}
        tasks={mockTasks}
        isDragOver={false}
        onDragOver={onDragOver}
        onDragLeave={vi.fn()}
        onDrop={onDrop}
      >
        <div>Child</div>
      </KanbanColumn>,
    )

    const dropZone = screen.getByText('Child').parentElement!
    const dataTransfer = {
      data: {} as Record<string, string>,
      setData(format: string, value: string) {
        this.data[format] = value
      },
      getData(format: string) {
        return this.data[format] ?? ''
      },
    } as DataTransfer

    fireEvent.dragOver(dropZone, { dataTransfer })
    fireEvent.drop(dropZone, { dataTransfer })

    expect(onDrop).toHaveBeenCalled()
  })
})
