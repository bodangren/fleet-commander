import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { SprintInfoBar } from './SprintInfoBar'
import type { Sprint } from '@/hooks/useKanbanBoard'

describe('SprintInfoBar', () => {
  const mockSprint: Sprint = {
    _id: 's1',
    projectId: 'p1',
    name: 'Sprint 14',
    status: 'active',
    budget: 50.0,
    actualCost: 32.4,
    pointsDelivered: 12,
    taskCount: 18,
    completedCount: 12,
    createdAt: Date.now(),
  }

  it('renders sprint name and status', () => {
    render(<SprintInfoBar sprint={mockSprint} totalPoints={18} totalEstimate={45.6} />)

    expect(screen.getByText('Sprint 14')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('displays budget spent and total', () => {
    render(<SprintInfoBar sprint={mockSprint} totalPoints={18} totalEstimate={45.6} />)

    expect(screen.getByText(/\$32\.40/)).toBeInTheDocument()
    expect(screen.getByText(/\$50\.00/)).toBeInTheDocument()
  })

  it('shows progress bar', () => {
    render(<SprintInfoBar sprint={mockSprint} totalPoints={18} totalEstimate={45.6} />)

    expect(screen.getByText('65% spent')).toBeInTheDocument()
  })

  it('shows close sprint button for active sprint', () => {
    const onClose = vi.fn()
    render(
      <SprintInfoBar
        sprint={mockSprint}
        totalPoints={18}
        totalEstimate={45.6}
        onCloseSprint={onClose}
      />,
    )

    expect(screen.getByText('Close Sprint')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Close Sprint'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows set active button for planned sprint', () => {
    const onActivate = vi.fn()
    const plannedSprint = { ...mockSprint, status: 'planned' as const }
    render(
      <SprintInfoBar
        sprint={plannedSprint}
        totalPoints={18}
        totalEstimate={45.6}
        onCloseSprint={onActivate}
      />,
    )

    expect(screen.getByText('Set Active')).toBeInTheDocument()
  })

  it('shows closed status for closed sprint', () => {
    const closedSprint = { ...mockSprint, status: 'closed' as const }
    render(<SprintInfoBar sprint={closedSprint} totalPoints={18} totalEstimate={45.6} />)

    expect(screen.getByText('Closed')).toBeInTheDocument()
    expect(screen.queryByText('Close Sprint')).not.toBeInTheDocument()
  })
})
