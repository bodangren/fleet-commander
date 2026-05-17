import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { AttentionNeeded } from './AttentionNeeded'
import { mockAlerts } from '@/__fixtures__/dashboardFixtures'

describe('AttentionNeeded', () => {
  it('renders empty state when no alerts are provided', () => {
    render(<AttentionNeeded alerts={[]} />)

    expect(screen.getByText(/all clear/i)).toBeInTheDocument()
  })

  it('renders empty state when all alerts are resolved', () => {
    const allResolved = mockAlerts.map(a => ({ ...a, resolved: true }))
    render(<AttentionNeeded alerts={allResolved} />)

    expect(screen.getByText(/all clear/i)).toBeInTheDocument()
  })

  it('renders unresolved alerts', () => {
    render(<AttentionNeeded alerts={mockAlerts} />)

    expect(screen.getByText('Budget exceeded by 20%')).toBeInTheDocument()
    expect(screen.getByText('Agent idle for 30min')).toBeInTheDocument()
  })

  it('filters out resolved alerts', () => {
    render(<AttentionNeeded alerts={mockAlerts} />)

    expect(screen.queryByText('Circuit breaker opened')).not.toBeInTheDocument()
  })

  it('applies critical severity styling', () => {
    render(<AttentionNeeded alerts={mockAlerts} />)

    const criticalAlert = screen.getByText('Budget exceeded by 20%').closest('[data-severity]')
    expect(criticalAlert).toHaveAttribute('data-severity', 'critical')
  })

  it('applies warning severity styling', () => {
    render(<AttentionNeeded alerts={mockAlerts} />)

    const warningAlert = screen.getByText('Agent idle for 30min').closest('[data-severity]')
    expect(warningAlert).toHaveAttribute('data-severity', 'warning')
  })

  it('renders multiple unresolved alerts', () => {
    const multiple = [
      {
        type: 'blocker',
        severity: 'critical' as const,
        message: 'Deployment blocked',
        resolved: false,
      },
      { type: 'budget', severity: 'warning' as const, message: 'Budget at 90%', resolved: false },
      {
        type: 'ab_test',
        severity: 'info' as const,
        message: 'Experiment running',
        resolved: false,
      },
    ]
    render(<AttentionNeeded alerts={multiple} />)

    expect(screen.getByText('Deployment blocked')).toBeInTheDocument()
    expect(screen.getByText('Budget at 90%')).toBeInTheDocument()
    expect(screen.getByText('Experiment running')).toBeInTheDocument()
  })
})
