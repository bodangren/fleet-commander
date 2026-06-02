import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { SprintRetrospectiveDashboard } from './SprintRetrospectiveDashboard'

const defaultProps = {
  sprintId: 'sprint-1',
  sprintName: 'Sprint 1',
  budget: 500,
  actualCost: 420,
  aggregateData: {
    taskCounts: { planned: 10, completed: 8, blocked: 1, failed: 1, carriedOver: 2 },
    agentWorkload: [
      { agent: 'alice', tasksAssigned: 6, tasksCompleted: 5, avgDurationMs: 3000 },
      { agent: 'bob', tasksAssigned: 4, tasksCompleted: 3, avgDurationMs: 5000 },
    ],
    velocity: { planned: 10, completed: 8, completionRate: 0.8 },
  },
  costTrend: [
    { sprintName: 'Sprint 1', budget: 500, actualCost: 420, costPerPoint: 15 },
    { sprintName: 'Sprint 2', budget: 600, actualCost: 550, costPerPoint: 18 },
  ],
  rejectionReasons: [
    { reason: 'Agent at max workload', count: 3 },
    { reason: 'Missing skill', count: 1 },
  ],
}

describe('SprintRetrospectiveDashboard', () => {
  it('renders task summary counts', () => {
    render(<SprintRetrospectiveDashboard {...defaultProps} />)
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('Blocked')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('renders velocity percentage', () => {
    render(<SprintRetrospectiveDashboard {...defaultProps} />)
    expect(screen.getByText('80%')).toBeInTheDocument()
  })

  it('renders agent performance table', () => {
    render(<SprintRetrospectiveDashboard {...defaultProps} />)
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('bob')).toBeInTheDocument()
  })

  it('renders rejection reasons', () => {
    render(<SprintRetrospectiveDashboard {...defaultProps} />)
    expect(screen.getByText('Agent at max workload')).toBeInTheDocument()
  })

  it('renders export markdown button', () => {
    render(<SprintRetrospectiveDashboard {...defaultProps} />)
    expect(screen.getByTestId('export-markdown-btn')).toBeInTheDocument()
  })

  it('renders auto insights', () => {
    render(<SprintRetrospectiveDashboard {...defaultProps} />)
    expect(screen.getByTestId('auto-insights')).toBeInTheDocument()
  })

  it('renders cost trend section', () => {
    render(<SprintRetrospectiveDashboard {...defaultProps} />)
    expect(screen.getByText('Cost per Sprint')).toBeInTheDocument()
  })

  it('renders empty rejection state', () => {
    render(<SprintRetrospectiveDashboard {...defaultProps} rejectionReasons={[]} />)
    expect(screen.getByText('No rejections recorded')).toBeInTheDocument()
  })
})
