import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { SprintDetailView } from './SprintDetailView'
import { mockSprintHistory } from '@/__fixtures__/historyFixtures'

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
    expect(screen.getByText(`${sprint.completedCount} / ${sprint.taskCount}`)).toBeInTheDocument()
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
})
