import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { SprintStatus } from './SprintStatus'

const mockSprint = {
  name: 'Sprint 14',
  status: 'active',
  budget: 50,
  actualCost: 32.4,
  pointsDelivered: 12,
  taskCount: 18,
  completedCount: 12,
}

describe('SprintStatus', () => {
  it('renders sprint name and status', () => {
    render(<SprintStatus sprint={mockSprint} />)
    expect(screen.getByText('Sprint 14')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('displays budget actual / estimated', () => {
    render(<SprintStatus sprint={mockSprint} />)
    expect(screen.getByText(/\$32\.40/)).toBeInTheDocument()
    expect(screen.getByText(/\$50\.00/)).toBeInTheDocument()
  })

  it('shows stats grid', () => {
    render(<SprintStatus sprint={mockSprint} />)
    expect(screen.getByText('Points Delivered')).toBeInTheDocument()
    expect(screen.getByText('Tasks Complete')).toBeInTheDocument()
    expect(screen.getByText('Budget Remaining')).toBeInTheDocument()
  })

  it('renders no sprint state', () => {
    render(<SprintStatus sprint={null} />)
    expect(screen.getByText('No Active Sprint')).toBeInTheDocument()
  })
})
