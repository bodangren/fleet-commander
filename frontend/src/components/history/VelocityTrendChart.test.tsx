import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { VelocityTrendChart } from './VelocityTrendChart'
import type { SprintHistoryItem } from '@/__fixtures__/historyFixtures'

describe('VelocityTrendChart', () => {
  it('shows empty state when no sprints are provided', () => {
    render(<VelocityTrendChart sprints={[]} />)

    expect(screen.getByText('No velocity data')).toBeInTheDocument()
  })

  it('renders chart with a single sprint', () => {
    const singleSprint: SprintHistoryItem[] = [
      {
        _id: 'sprint-1',
        name: 'Sprint 1',
        status: 'closed',
        startDate: Date.now() - 1000 * 60 * 60 * 24 * 14,
        endDate: Date.now() - 1000 * 60 * 60 * 24 * 1,
        budget: 500,
        actualCost: 450,
        pointsDelivered: 20,
        pointsEstimated: 25,
        taskCount: 10,
        completedCount: 9,
        velocity: 1.43,
      },
    ]

    render(<VelocityTrendChart sprints={singleSprint} />)

    expect(screen.getByText('Velocity Trend')).toBeInTheDocument()
    expect(screen.getByText('Sprint 1')).toBeInTheDocument()
  })

  it('renders chart with multiple sprints', () => {
    const sprints: SprintHistoryItem[] = [
      {
        _id: 'sprint-1',
        name: 'Sprint 1',
        status: 'closed',
        startDate: Date.now() - 1000 * 60 * 60 * 24 * 28,
        endDate: Date.now() - 1000 * 60 * 60 * 24 * 14,
        budget: 500,
        actualCost: 487.33,
        pointsDelivered: 24,
        pointsEstimated: 28,
        taskCount: 12,
        completedCount: 10,
        velocity: 1.71,
      },
      {
        _id: 'sprint-2',
        name: 'Sprint 2',
        status: 'closed',
        startDate: Date.now() - 1000 * 60 * 60 * 24 * 14,
        endDate: Date.now() - 1000 * 60 * 60 * 24 * 1,
        budget: 550,
        actualCost: 523.75,
        pointsDelivered: 28,
        pointsEstimated: 30,
        taskCount: 14,
        completedCount: 13,
        velocity: 2.0,
      },
    ]

    render(<VelocityTrendChart sprints={sprints} />)

    expect(screen.getByText('Velocity Trend')).toBeInTheDocument()
    expect(screen.getByText('1.71')).toBeInTheDocument()
    expect(screen.getByText('2.00')).toBeInTheDocument()
  })

  it('handles zero velocity without crashing', () => {
    const zeroVelocitySprint: SprintHistoryItem[] = [
      {
        _id: 'sprint-0',
        name: 'Sprint 0',
        status: 'closed',
        startDate: Date.now() - 1000 * 60 * 60 * 24 * 14,
        endDate: Date.now() - 1000 * 60 * 60 * 24 * 1,
        budget: 300,
        actualCost: 0,
        pointsDelivered: 0,
        pointsEstimated: 10,
        taskCount: 0,
        completedCount: 0,
        velocity: 0,
      },
    ]

    render(<VelocityTrendChart sprints={zeroVelocitySprint} />)

    expect(screen.getByText('Velocity Trend')).toBeInTheDocument()
    expect(screen.getByText('0.00')).toBeInTheDocument()
  })
})
