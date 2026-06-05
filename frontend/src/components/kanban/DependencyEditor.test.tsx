import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { DependencyEditor } from './DependencyEditor'
import type { KanbanTask } from '@/hooks/useKanbanBoard'

describe('DependencyEditor', () => {
  const mockTasks: KanbanTask[] = [
    {
      _id: 'task-1',
      taskKey: 'TASK-A',
      projectId: 'proj-1',
      title: 'Setup auth',
      description: '',
      storyPoints: 3,
      status: 'done',
      priority: 'high',
      costEstimate: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      _id: 'task-2',
      taskKey: 'TASK-B',
      projectId: 'proj-1',
      title: 'Build API',
      description: '',
      storyPoints: 5,
      status: 'in_progress',
      priority: 'medium',
      costEstimate: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      _id: 'task-3',
      taskKey: 'TASK-C',
      projectId: 'proj-1',
      title: 'Write tests',
      description: '',
      storyPoints: 2,
      status: 'ready',
      priority: 'low',
      costEstimate: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]

  const mockDependencies = [
    { taskKey: 'TASK-A', title: 'Setup auth', status: 'done', storyPoints: 3 },
  ]

  it('renders current dependencies', () => {
    render(
      <DependencyEditor
        taskKey="TASK-B"
        dependencies={mockDependencies}
        allTasks={mockTasks}
        onAdd={vi.fn().mockResolvedValue({ ok: true })}
        onRemove={vi.fn().mockResolvedValue({ ok: true })}
      />,
    )
    expect(screen.getByText('Setup auth')).toBeInTheDocument()
    expect(screen.getByText('TASK-A')).toBeInTheDocument()
  })

  it('shows dependency count', () => {
    render(
      <DependencyEditor
        taskKey="TASK-B"
        dependencies={mockDependencies}
        allTasks={mockTasks}
        onAdd={vi.fn().mockResolvedValue({ ok: true })}
        onRemove={vi.fn().mockResolvedValue({ ok: true })}
      />,
    )
    expect(screen.getByText('1 blocker')).toBeInTheDocument()
  })

  it('shows search input', () => {
    render(
      <DependencyEditor
        taskKey="TASK-B"
        dependencies={[]}
        allTasks={mockTasks}
        onAdd={vi.fn().mockResolvedValue({ ok: true })}
        onRemove={vi.fn().mockResolvedValue({ ok: true })}
      />,
    )
    expect(screen.getByPlaceholderText('Add dependency by task key...')).toBeInTheDocument()
  })

  it('filters tasks in search dropdown', async () => {
    render(
      <DependencyEditor
        taskKey="TASK-B"
        dependencies={[]}
        allTasks={mockTasks}
        onAdd={vi.fn().mockResolvedValue({ ok: true })}
        onRemove={vi.fn().mockResolvedValue({ ok: true })}
      />,
    )
    const input = screen.getByPlaceholderText('Add dependency by task key...')
    fireEvent.change(input, { target: { value: 'auth' } })
    await waitFor(() => {
      expect(screen.getByText('Setup auth')).toBeInTheDocument()
    })
  })

  it('excludes current task from search results', async () => {
    render(
      <DependencyEditor
        taskKey="TASK-B"
        dependencies={[]}
        allTasks={mockTasks}
        onAdd={vi.fn().mockResolvedValue({ ok: true })}
        onRemove={vi.fn().mockResolvedValue({ ok: true })}
      />,
    )
    const input = screen.getByPlaceholderText('Add dependency by task key...')
    fireEvent.change(input, { target: { value: 'Build' } })
    // TASK-B should not appear since it's the current task
    await waitFor(() => {
      expect(screen.queryByText('TASK-B')).not.toBeInTheDocument()
    })
  })

  it('calls onAdd when selecting a task', async () => {
    const onAdd = vi.fn().mockResolvedValue({ ok: true })
    render(
      <DependencyEditor
        taskKey="TASK-B"
        dependencies={[]}
        allTasks={mockTasks}
        onAdd={onAdd}
        onRemove={vi.fn().mockResolvedValue({ ok: true })}
      />,
    )
    const input = screen.getByPlaceholderText('Add dependency by task key...')
    fireEvent.change(input, { target: { value: 'TASK-C' } })
    await waitFor(() => {
      const button = screen.getByText('Write tests')
      fireEvent.click(button)
    })
    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith('TASK-C')
    })
  })

  it('shows error from onAdd', async () => {
    const onAdd = vi.fn().mockResolvedValue({ ok: false, error: 'Would create cycle' })
    render(
      <DependencyEditor
        taskKey="TASK-B"
        dependencies={[]}
        allTasks={mockTasks}
        onAdd={onAdd}
        onRemove={vi.fn().mockResolvedValue({ ok: true })}
      />,
    )
    const input = screen.getByPlaceholderText('Add dependency by task key...')
    fireEvent.change(input, { target: { value: 'TASK-C' } })
    await waitFor(() => {
      fireEvent.click(screen.getByText('Write tests'))
    })
    await waitFor(() => {
      expect(screen.getByText('Would create cycle')).toBeInTheDocument()
    })
  })
})
