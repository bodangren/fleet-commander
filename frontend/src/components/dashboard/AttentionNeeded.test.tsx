import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { AttentionNeeded } from './AttentionNeeded'

const mockAlerts = [
  { _id: 'al1', type: 'budget_breach', severity: 'critical', message: 'Budget exceeded', createdAt: Date.now() - 60000 },
]

const mockSprint = { budget: 100, actualCost: 80, taskCount: 5, completedCount: 3 }

describe('AttentionNeeded', () => {
  it('renders blocked tasks', () => {
    render(
      <AttentionNeeded
        alerts={[]}
        blockedTasks={[{ _id: 't1', title: 'DB migration' }]}
        sprint={null}
      />,
    )
    expect(screen.getByText('1 task blocked')).toBeInTheDocument()
    expect(screen.getByText('DB migration')).toBeInTheDocument()
  })

  it('renders budget warning when over 60%', () => {
    render(<AttentionNeeded alerts={[]} blockedTasks={[]} sprint={mockSprint} />)
    expect(screen.getByText('Budget at 80%')).toBeInTheDocument()
  })

  it('renders alerts', () => {
    render(<AttentionNeeded alerts={mockAlerts} blockedTasks={[]} sprint={null} />)
    expect(screen.getByText('Budget exceeded')).toBeInTheDocument()
  })

  it('shows all clear when empty', () => {
    render(<AttentionNeeded alerts={[]} blockedTasks={[]} sprint={null} />)
    expect(screen.getByText('All clear — no attention items')).toBeInTheDocument()
  })
})
