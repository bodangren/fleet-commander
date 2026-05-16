import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { KanbanColumn } from '@/components/KanbanColumn'
import { TaskCard } from '@/components/TaskCard'

describe('KanbanColumn', () => {
  const mockColumn = {
    _id: 'col-ready',
    name: 'Ready',
    order: 0,
    boardId: 'board-1',
    createdAt: Date.now(),
  }

  const mockTasks = [
    {
      _id: 't1',
      title: 'Task 1',
      description: 'First task',
      status: 'ready',
      priority: 'medium' as const,
      projectId: 'p1',
      createdAt: 0,
      updatedAt: 0,
    },
    {
      _id: 't2',
      title: 'Task 2',
      description: 'Second task',
      status: 'ready',
      priority: 'low' as const,
      projectId: 'p1',
      createdAt: 0,
      updatedAt: 0,
    },
  ]

  it('renders column title', () => {
    render(
      <KanbanColumn column={mockColumn} tasks={[]} onDropTask={vi.fn()}>
        <div>Child</div>
      </KanbanColumn>,
    )

    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('renders correct task count', () => {
    render(
      <KanbanColumn column={mockColumn} tasks={mockTasks} onDropTask={vi.fn()}>
        {mockTasks.map((t) => (
          <TaskCard key={t._id} task={t} onClick={vi.fn()} />
        ))}
      </KanbanColumn>,
    )

    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders zero task count for empty column', () => {
    render(
      <KanbanColumn column={mockColumn} tasks={[]} onDropTask={vi.fn()}>
        <div>Empty</div>
      </KanbanColumn>,
    )

    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('has drop zone data attribute', () => {
    render(
      <KanbanColumn column={mockColumn} tasks={[]} onDropTask={vi.fn()}>
        <div>Child</div>
      </KanbanColumn>,
    )

    expect(screen.getByRole('list')).toHaveAttribute(
      'data-column-id',
      'col-ready',
    )
  })

  it('calls onDropTask when a task is dropped', () => {
    const onDropTask = vi.fn()
    render(
      <KanbanColumn column={mockColumn} tasks={mockTasks} onDropTask={onDropTask}>
        {mockTasks.map((t) => (
          <TaskCard key={t._id} task={t} onClick={vi.fn()} />
        ))}
      </KanbanColumn>,
    )

    const dropZone = screen.getByRole('list')
    const dataTransfer = {
      data: {} as Record<string, string>,
      effectAllowed: 'move',
      setData(format: string, value: string) {
        this.data[format] = value
      },
      getData(format: string) {
        return this.data[format] ?? ''
      },
    } as DataTransfer

    fireEvent.dragOver(dropZone, { dataTransfer })
    fireEvent.drop(dropZone, { dataTransfer })

    expect(onDropTask).toHaveBeenCalled()
  })

  it('renders children task cards', () => {
    render(
      <KanbanColumn column={mockColumn} tasks={mockTasks} onDropTask={vi.fn()}>
        {mockTasks.map((t) => (
          <TaskCard key={t._id} task={t} onClick={vi.fn()} />
        ))}
      </KanbanColumn>,
    )

    expect(screen.getByText('Task 1')).toBeInTheDocument()
    expect(screen.getByText('Task 2')).toBeInTheDocument()
  })
})
