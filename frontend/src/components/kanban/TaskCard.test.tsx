import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'

import { TaskCard } from './TaskCard'
import type { KanbanTask } from '@/hooks/useKanbanBoard'

/**
 * Cast helper for the not-yet-wired `blockers` prop. The Phase 3 spec requires
 * the BLOCKED badge to expose the names of blocking tasks on hover; this is
 * the Red gate — the prop is not yet on `TaskCardProps`, so we widen the
 * component type locally for the test.
 */
const TaskCardWithBlockers = TaskCard as unknown as React.FC<
  ComponentProps<typeof TaskCard> & { blockers?: string[] }
>

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

  // ------------------------------------------------------------------
  // Phase 3 Task 3 — Red gates: BLOCKED badge with hover tooltip
  // (per spec: "show blocked badge when dependencies incomplete; hover
  //  tooltip with blocker names")
  // ------------------------------------------------------------------

  it('renders a hover tooltip with blocker names when the task is blocked', () => {
    // The BLOCKED badge is the natural hover target. The spec requires the
    // tooltip surface (title or aria-label or a tooltip role) to mention
    // every blocking task key so the user can see what is in the way.
    const task = { ...mockTask, status: 'blocked' as const }
    render(<TaskCardWithBlockers task={task} blockers={['TASK-A', 'TASK-C']} />)
    const badge = screen.getByText('BLOCKED')
    const describedBy =
      badge.getAttribute('title') ??
      badge.getAttribute('aria-label') ??
      badge.closest('[title]')?.getAttribute('title') ??
      badge.closest('[aria-label]')?.getAttribute('aria-label') ??
      ''
    expect(describedBy).toMatch(/TASK-A/)
    expect(describedBy).toMatch(/TASK-C/)
  })

  it('keeps the BLOCKED badge visible even when no blocker names are supplied', () => {
    // Backwards compatibility — the badge must still render when the caller
    // has not yet computed the blocker list. The tooltip simply omits the
    // names in that case but the badge stays.
    const task = { ...mockTask, status: 'blocked' as const }
    render(<TaskCard task={task} />)
    expect(screen.getByText('BLOCKED')).toBeInTheDocument()
  })

  it('does NOT render a BLOCKED badge for tasks that are not blocked', () => {
    const task = { ...mockTask, status: 'ready' as const }
    render(<TaskCardWithBlockers task={task} blockers={['TASK-A']} />)
    expect(screen.queryByText('BLOCKED')).not.toBeInTheDocument()
  })

  it('calls onUnblock with the task id when the Unblock button is clicked', () => {
    const onUnblock = vi.fn()
    const task = { ...mockTask, status: 'blocked' as const }
    render(<TaskCard task={task} onUnblock={onUnblock} />)
    fireEvent.click(screen.getByRole('button', { name: /unblock task/i }))
    expect(onUnblock).toHaveBeenCalledWith('task-1')
  })

  it('omits the Unblock button when no onUnblock handler is provided', () => {
    const task = { ...mockTask, status: 'blocked' as const }
    render(<TaskCard task={task} />)
    expect(screen.queryByRole('button', { name: /unblock task/i })).not.toBeInTheDocument()
  })

  it('applies a distinct yellow left-border treatment to blocked cards', () => {
    // The visual treatment for 'blocked' is distinct from 'in_progress' and
    // 'review' which use blue and green respectively. The plan calls for
    // a "distinct visual treatment" — the className is the contract.
    const blocked = { ...mockTask, status: 'blocked' as const }
    const inProgress = { ...mockTask, status: 'in_progress' as const }
    const { container: blockedC } = render(<TaskCard task={blocked} />)
    const { container: inProgressC } = render(<TaskCard task={inProgress} />)
    const blockedClass = blockedC.querySelector('[data-task-id]')?.className ?? ''
    const inProgressClass = inProgressC.querySelector('[data-task-id]')?.className ?? ''
    // blocked uses yellow (eab308); in_progress uses blue (5e6ad2)
    expect(blockedClass).toMatch(/#eab308/i)
    expect(blockedClass).not.toMatch(/5e6ad2/)
    expect(inProgressClass).toMatch(/5e6ad2/)
  })
})
