import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { SprintDetailView } from './SprintDetailView'
import { mockSprintHistory } from '@/__fixtures__/historyFixtures'

vi.mock('@/lib/useConvexData', () => ({
  useSprintAggregateData: vi.fn(),
  useSprintCostTrend: vi.fn(),
  useSprintRejectionReasons: vi.fn(),
}))

describe('SprintDetailView', () => {
  it('renders sprint details when a sprint is provided', () => {
    const sprint = mockSprintHistory[0]
    render(<SprintDetailView sprint={sprint} />)

    expect(screen.getByText(sprint.name)).toBeInTheDocument()
    expect(screen.getByText(/budget/i)).toBeInTheDocument()
    expect(screen.getByText(String(sprint.budget))).toBeInTheDocument()
    expect(screen.getByText(/actual cost/i)).toBeInTheDocument()
    expect(screen.getByText(String(sprint.actualCost))).toBeInTheDocument()
    expect(screen.getByText(/points delivered/i)).toBeInTheDocument()
    expect(screen.getByText(String(sprint.pointsDelivered))).toBeInTheDocument()
    expect(screen.getByText(/tasks/i)).toBeInTheDocument()
    const tasksEl = screen.getByText(
      (_, el) => el?.textContent === `${sprint.completedCount}/${sprint.taskCount}`,
    )
    expect(tasksEl).toBeInTheDocument()
  })

  it('shows empty state when no sprint is selected', () => {
    render(<SprintDetailView sprint={null} />)

    expect(screen.getByText('Select a sprint to view details')).toBeInTheDocument()
  })

  it('calls onBack when back button is clicked', () => {
    const handleBack = vi.fn()
    const sprint = mockSprintHistory[0]
    render(<SprintDetailView sprint={sprint} onBack={handleBack} />)

    const backButton = screen.getByRole('button', { name: /back/i })
    fireEvent.click(backButton)

    expect(handleBack).toHaveBeenCalledTimes(1)
  })

  it('does not show retrospective tab for active sprints', () => {
    const sprint = mockSprintHistory[0] // status: 'active'
    render(<SprintDetailView sprint={sprint} />)
    expect(screen.queryByTestId('sprint-detail-tabs')).not.toBeInTheDocument()
  })

  it('shows retrospective tab for closed sprints', () => {
    const sprint = mockSprintHistory[1] // status: 'closed'
    render(<SprintDetailView sprint={sprint} />)
    expect(screen.getByTestId('sprint-detail-tabs')).toBeInTheDocument()
    expect(screen.getByTestId('tab-details')).toBeInTheDocument()
    expect(screen.getByTestId('tab-retrospective')).toBeInTheDocument()
  })
})
