import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { CostTrendChart } from './CostTrendChart'
import type { AgentHistoryItem } from '@/__fixtures__/historyFixtures'

describe('CostTrendChart', () => {
  it('shows empty state when no agents are provided', () => {
    render(<CostTrendChart agents={[]} />)

    expect(screen.getByText('No cost data')).toBeInTheDocument()
  })

  it('renders chart with a single agent', () => {
    const singleAgent: AgentHistoryItem[] = [
      {
        _id: 'agent-history-1',
        name: 'alice',
        displayName: 'Alice',
        model: 'claude-opus',
        tasksCompleted: 42,
        totalCost: 1250.5,
        avgLatencyMs: 3400,
        reliability: 0.95,
        periodStart: Date.now() - 1000 * 60 * 60 * 24 * 30,
        periodEnd: Date.now(),
      },
    ]

    render(<CostTrendChart agents={singleAgent} />)

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('1250.50')).toBeInTheDocument()
  })

  it('renders chart with multiple agents', () => {
    const agents: AgentHistoryItem[] = [
      {
        _id: 'agent-history-1',
        name: 'alice',
        displayName: 'Alice',
        model: 'claude-opus',
        tasksCompleted: 42,
        totalCost: 1250.5,
        avgLatencyMs: 3400,
        reliability: 0.95,
        periodStart: Date.now() - 1000 * 60 * 60 * 24 * 30,
        periodEnd: Date.now(),
      },
      {
        _id: 'agent-history-2',
        name: 'bob',
        displayName: 'Bob',
        model: 'claude-sonnet',
        tasksCompleted: 38,
        totalCost: 890.25,
        avgLatencyMs: 2100,
        reliability: 0.92,
        periodStart: Date.now() - 1000 * 60 * 60 * 24 * 30,
        periodEnd: Date.now(),
      },
    ]

    render(<CostTrendChart agents={agents} />)

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('1250.50')).toBeInTheDocument()
    expect(screen.getByText('890.25')).toBeInTheDocument()
  })

  it('handles zero cost without crashing', () => {
    const zeroCostAgent: AgentHistoryItem[] = [
      {
        _id: 'agent-history-0',
        name: 'charlie',
        displayName: 'Charlie',
        model: 'gpt-4o-mini',
        tasksCompleted: 5,
        totalCost: 0,
        avgLatencyMs: 800,
        reliability: 0.88,
        periodStart: Date.now() - 1000 * 60 * 60 * 24 * 30,
        periodEnd: Date.now(),
      },
    ]

    render(<CostTrendChart agents={zeroCostAgent} />)

    expect(screen.getByText('Charlie')).toBeInTheDocument()
    expect(screen.getByText('0.00')).toBeInTheDocument()
  })
})
