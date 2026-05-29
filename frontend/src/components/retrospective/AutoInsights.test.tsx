import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { AutoInsights, generateInsights } from './AutoInsights'

describe('generateInsights', () => {
  const baseData = {
    taskCounts: { planned: 10, completed: 8, blocked: 0, failed: 0 },
    agentWorkload: [],
    velocity: { completionRate: 0.8 },
    costPerPoint: 15.5,
    rejectionReasons: [],
  }

  it('reports excellent velocity when >= 90%', () => {
    const insights = generateInsights({ ...baseData, velocity: { completionRate: 0.95 } })
    expect(insights.some((i) => i.includes('Excellent velocity'))).toBe(true)
  })

  it('reports low velocity when < 50%', () => {
    const insights = generateInsights({ ...baseData, velocity: { completionRate: 0.3 } })
    expect(insights.some((i) => i.includes('Low velocity'))).toBe(true)
  })

  it('reports blocked tasks', () => {
    const insights = generateInsights({
      ...baseData,
      taskCounts: { planned: 10, completed: 5, blocked: 3, failed: 0 },
    })
    expect(insights.some((i) => i.includes('3 tasks blocked'))).toBe(true)
  })

  it('reports failed tasks', () => {
    const insights = generateInsights({
      ...baseData,
      taskCounts: { planned: 10, completed: 5, blocked: 0, failed: 2 },
    })
    expect(insights.some((i) => i.includes('2 tasks failed'))).toBe(true)
  })

  it('reports top rejection reason when count >= 2', () => {
    const insights = generateInsights({
      ...baseData,
      rejectionReasons: [{ reason: 'Agent at max workload', count: 3 }],
    })
    expect(insights.some((i) => i.includes('Agent at max workload'))).toBe(true)
  })

  it('reports workload imbalance when one agent has 3x more tasks', () => {
    const insights = generateInsights({
      ...baseData,
      agentWorkload: [
        { agent: 'alice', tasksAssigned: 9, tasksCompleted: 8, avgDurationMs: 1000 },
        { agent: 'bob', tasksAssigned: 1, tasksCompleted: 1, avgDurationMs: 1000 },
      ],
    })
    expect(insights.some((i) => i.includes('Workload imbalance'))).toBe(true)
  })

  it('includes cost per point when available', () => {
    const insights = generateInsights(baseData)
    expect(insights.some((i) => i.includes('$15.50'))).toBe(true)
  })

  it('reports no significant patterns when data is normal', () => {
    const insights = generateInsights({
      taskCounts: { planned: 10, completed: 7, blocked: 0, failed: 0 },
      agentWorkload: [
        { agent: 'alice', tasksAssigned: 5, tasksCompleted: 4, avgDurationMs: 1000 },
        { agent: 'bob', tasksAssigned: 5, tasksCompleted: 3, avgDurationMs: 1200 },
      ],
      velocity: { completionRate: 0.7 },
      costPerPoint: 0,
      rejectionReasons: [],
    })
    expect(insights.some((i) => i.includes('No significant patterns'))).toBe(true)
  })
})

describe('AutoInsights', () => {
  it('renders insight bullets', () => {
    render(
      <AutoInsights
        data={{
          taskCounts: { planned: 10, completed: 8, blocked: 1, failed: 0 },
          agentWorkload: [],
          velocity: { completionRate: 0.8 },
          costPerPoint: 12,
          rejectionReasons: [],
        }}
      />,
    )
    expect(screen.getByTestId('auto-insights')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0)
  })
})
