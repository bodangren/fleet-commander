import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'

import type { KanbanTask } from '@/hooks/useKanbanBoard'

/**
 * Phase 3 Task 2 — Red gate: Integrate `DependencyEditor` into task detail panel.
 *
 * The kanban board currently has no task detail panel. The Phase 3 plan calls
 * for one that integrates the existing `DependencyEditor` so users can add and
 * remove dependencies from the panel. This file pins the expected public API
 * and behavior; it will pass once the component is implemented.
 *
 * Why the import is allowed to fail: the spec is for a NEW component
 * (`KanbanTaskDetailPanel`) that does not yet exist. The vitest module
 * resolver will surface the "Cannot find module" error, which IS the Red
 * signal — the next role (Green phase) implements the component to make
 * the import resolve and the assertions pass.
 */
describe('KanbanTaskDetailPanel (Phase 3 Task 2)', () => {
  const mockTask: KanbanTask = {
    _id: 'task-1',
    taskKey: 'TASK-B',
    projectId: 'proj-1',
    title: 'Build API',
    description: 'Build the public API surface',
    storyPoints: 5,
    status: 'ready',
    priority: 'high',
    costEstimate: 21.0,
    createdAt: 0,
    updatedAt: 0,
  }

  const mockAllTasks: KanbanTask[] = [
    mockTask,
    {
      _id: 'task-2',
      taskKey: 'TASK-A',
      projectId: 'proj-1',
      title: 'Setup auth',
      description: '',
      storyPoints: 3,
      status: 'done',
      priority: 'high',
      costEstimate: 0,
      createdAt: 0,
      updatedAt: 0,
    },
  ]

  it('renders the task title and key in the panel header', async () => {
    const { KanbanTaskDetailPanel } = await import('./KanbanTaskDetailPanel')
    render(
      <KanbanTaskDetailPanel
        task={mockTask}
        dependencies={[]}
        allTasks={mockAllTasks}
        onAddDependency={vi.fn().mockResolvedValue({ ok: true })}
        onRemoveDependency={vi.fn().mockResolvedValue({ ok: true })}
      />,
    )
    expect(screen.getByText('Build API')).toBeInTheDocument()
    expect(screen.getByText('TASK-B')).toBeInTheDocument()
  })

  it('integrates DependencyEditor so the search input is reachable from the panel', async () => {
    const { KanbanTaskDetailPanel } = await import('./KanbanTaskDetailPanel')
    render(
      <KanbanTaskDetailPanel
        task={mockTask}
        dependencies={[]}
        allTasks={mockAllTasks}
        onAddDependency={vi.fn().mockResolvedValue({ ok: true })}
        onRemoveDependency={vi.fn().mockResolvedValue({ ok: true })}
      />,
    )
    // DependencyEditor renders an input with the "Add dependency by task key..."
    // placeholder. The panel MUST expose the editor — that is the integration.
    expect(
      screen.getByPlaceholderText('Add dependency by task key...'),
    ).toBeInTheDocument()
  })

  it('renders an existing dependency inside the panel via the DependencyEditor', async () => {
    const { KanbanTaskDetailPanel } = await import('./KanbanTaskDetailPanel')
    render(
      <KanbanTaskDetailPanel
        task={mockTask}
        dependencies={[
          { taskKey: 'TASK-A', title: 'Setup auth', status: 'done', storyPoints: 3 },
        ]}
        allTasks={mockAllTasks}
        onAddDependency={vi.fn().mockResolvedValue({ ok: true })}
        onRemoveDependency={vi.fn().mockResolvedValue({ ok: true })}
      />,
    )
    expect(screen.getByText('Setup auth')).toBeInTheDocument()
    expect(screen.getByText('TASK-A')).toBeInTheDocument()
  })

  it('wires the panel add button to onAddDependency so it can call the Convex mutation', async () => {
    const onAdd = vi.fn().mockResolvedValue({ ok: true })
    const { KanbanTaskDetailPanel } = await import('./KanbanTaskDetailPanel')
    render(
      <KanbanTaskDetailPanel
        task={mockTask}
        dependencies={[]}
        allTasks={mockAllTasks}
        onAddDependency={onAdd}
        onRemoveDependency={vi.fn().mockResolvedValue({ ok: true })}
      />,
    )
    const input = screen.getByPlaceholderText('Add dependency by task key...')
    fireEvent.change(input, { target: { value: 'TASK-A' } })
    await waitFor(() => {
      fireEvent.click(screen.getByText('Setup auth'))
    })
    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith('TASK-A')
    })
  })

  it('wires the panel remove button to onRemoveDependency', async () => {
    const onRemove = vi.fn().mockResolvedValue({ ok: true })
    const { KanbanTaskDetailPanel } = await import('./KanbanTaskDetailPanel')
    render(
      <KanbanTaskDetailPanel
        task={mockTask}
        dependencies={[
          { taskKey: 'TASK-A', title: 'Setup auth', status: 'done', storyPoints: 3 },
        ]}
        allTasks={mockAllTasks}
        onAddDependency={vi.fn().mockResolvedValue({ ok: true })}
        onRemoveDependency={onRemove}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove dependency TASK-A' }))
    await waitFor(() => {
      expect(onRemove).toHaveBeenCalledWith('TASK-A')
    })
  })
})
