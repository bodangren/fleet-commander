import { describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

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
    const user = userEvent.setup()
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
    await user.type(input, 'auth')
    expect(await screen.findByRole('button', { name: /setup auth/i })).toBeInTheDocument()
  })

  it('excludes current task from search results', async () => {
    const user = userEvent.setup()
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
    await user.type(input, 'Build')
    // TASK-B should not appear since it's the current task
    expect(screen.queryByRole('button', { name: /build api/i })).not.toBeInTheDocument()
  })

  it('calls onAdd when selecting a task', async () => {
    const user = userEvent.setup()
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
    await user.type(input, 'TASK-C')
    const task = await screen.findByRole('button', { name: /write tests/i })
    await user.click(task)
    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith('TASK-C')
    })
    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('shows error from onAdd', async () => {
    const user = userEvent.setup()
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
    await user.type(input, 'TASK-C')
    await user.click(await screen.findByRole('button', { name: /write tests/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Would create cycle')
  })

  // ------------------------------------------------------------------
  // Phase 3 Task 1 — additional Red gates
  // (Build DependencyEditor: search autocomplete, add/remove, cycle warning)
  // ------------------------------------------------------------------

  it('excludes dependencies that are already in the dependency list from the search results', async () => {
    const user = userEvent.setup()
    // TASK-A is already a dependency of TASK-B. The dropdown must NOT offer it
    // as a candidate to add again. (The title is also rendered in the dep row
    // at the top of the editor — target the dropdown button specifically.)
    render(
      <DependencyEditor
        taskKey="TASK-B"
        dependencies={[{ taskKey: 'TASK-A', title: 'Setup auth', status: 'done', storyPoints: 3 }]}
        allTasks={mockTasks}
        onAdd={vi.fn().mockResolvedValue({ ok: true })}
        onRemove={vi.fn().mockResolvedValue({ ok: true })}
      />,
    )
    const input = screen.getByPlaceholderText('Add dependency by task key...')
    await user.type(input, 'TASK-A')
    // The dependency row at the top uses a span for the title; the dropdown
    // uses a button. So this assertion specifically targets the dropdown.
    expect(screen.queryByRole('button', { name: /Setup auth/ })).not.toBeInTheDocument()
  })

  it('clears the search query and closes the dropdown after a successful add', async () => {
    const user = userEvent.setup()
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
    const input = screen.getByPlaceholderText('Add dependency by task key...') as HTMLInputElement
    await user.type(input, 'TASK-C')
    await user.click(await screen.findByRole('button', { name: /write tests/i }))
    await waitFor(() => {
      expect(input).toHaveValue('')
    })
    expect(screen.queryByRole('button', { name: /write tests/i })).not.toBeInTheDocument()
  })

  it('shows a dedicated cycle warning with the Wording the mutation returns', async () => {
    const user = userEvent.setup()
    // The cycle error string from convex/dependencies.ts is
    // "Adding this dependency would create a cycle". The component must surface
    // it with a [role="alert"] so screen readers and the test can target it.
    const onAdd = vi.fn().mockResolvedValue({
      ok: false,
      error: 'Adding this dependency would create a cycle',
    })
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
    await user.type(input, 'TASK-C')
    await user.click(await screen.findByRole('button', { name: /write tests/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/create a cycle/i)
  })

  it('disables the search input while an add is in flight', async () => {
    const user = userEvent.setup()
    let resolveAdd: (v: { ok: boolean; error?: string }) => void = () => {}
    const onAdd = vi.fn().mockImplementation(
      () =>
        new Promise<{ ok: boolean; error?: string }>(resolve => {
          resolveAdd = resolve
        }),
    )
    render(
      <DependencyEditor
        taskKey="TASK-B"
        dependencies={[]}
        allTasks={mockTasks}
        onAdd={onAdd}
        onRemove={vi.fn().mockResolvedValue({ ok: true })}
      />,
    )
    const input = screen.getByPlaceholderText('Add dependency by task key...') as HTMLInputElement
    await user.type(input, 'TASK-C')
    await user.click(await screen.findByRole('button', { name: /write tests/i }))
    await waitFor(() => {
      expect(input).toBeDisabled()
    })
    await act(async () => {
      resolveAdd({ ok: true })
    })
    await waitFor(() => {
      expect(input).toBeEnabled()
      expect(input).toHaveValue('')
    })
  })

  it('closes the dropdown when clicking outside the search container', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <button data-testid="outside">Outside</button>
        <DependencyEditor
          taskKey="TASK-B"
          dependencies={[]}
          allTasks={mockTasks}
          onAdd={vi.fn().mockResolvedValue({ ok: true })}
          onRemove={vi.fn().mockResolvedValue({ ok: true })}
        />
      </div>,
    )
    const input = screen.getByPlaceholderText('Add dependency by task key...')
    await user.type(input, 'auth')
    expect(await screen.findByRole('button', { name: /setup auth/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Outside' }))
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /setup auth/i })).not.toBeInTheDocument()
    })
  })

  it('clears a prior error when the user starts a new search', async () => {
    const user = userEvent.setup()
    const onAdd = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: 'Would create cycle' })
      .mockResolvedValueOnce({ ok: true })
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
    await user.type(input, 'TASK-C')
    await user.click(await screen.findByRole('button', { name: /write tests/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Would create cycle')
    await user.clear(input)
    await user.type(input, 'TASK-A')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /setup auth/i })).toBeInTheDocument()
  })
})
