import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { SprintStatus } from './SprintStatus'
import { mockSprint } from '@/__fixtures__/dashboardFixtures'

describe('SprintStatus', () => {
  it('renders sprint name and status', () => {
    render(<SprintStatus sprint={mockSprint} />)

    expect(screen.getByText('Sprint 42')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('displays budget actual / estimated', () => {
    render(<SprintStatus sprint={mockSprint} />)

    expect(screen.getByText(/\$450\.50/)).toBeInTheDocument()
    expect(screen.getByText(/\$500\.00/)).toBeInTheDocument()
  })

  it('shows progress bar with correct width', () => {
    render(<SprintStatus sprint={mockSprint} />)

    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '90')
  })

  it('formats zero budget correctly', () => {
    const zeroBudgetSprint = { ...mockSprint, budget: { actual: 0, estimated: 0 } }
    render(<SprintStatus sprint={zeroBudgetSprint} />)

    expect(screen.getAllByText(/\$0\.00/).length).toBeGreaterThanOrEqual(1)
  })

  it('formats over-budget correctly', () => {
    const overBudgetSprint = { ...mockSprint, budget: { actual: 600, estimated: 500 } }
    render(<SprintStatus sprint={overBudgetSprint} />)

    expect(screen.getByText(/\$600\.00/)).toBeInTheDocument()
    expect(screen.getByText(/\$500\.00/)).toBeInTheDocument()

    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '120')
  })

  it('handles zero points without error', () => {
    const zeroPointsSprint = { ...mockSprint, points: { delivered: 0, estimated: 0 } }
    render(<SprintStatus sprint={zeroPointsSprint} />)

    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('shows key stats grid with tasks and points', () => {
    render(<SprintStatus sprint={mockSprint} />)

    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText('40')).toBeInTheDocument()
  })
})
