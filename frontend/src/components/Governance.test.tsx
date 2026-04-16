import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Governance, GovernanceData } from './Governance'

describe('Governance', () => {
  const frozen = new Date('2026-04-17T12:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(frozen)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function getMockData(): GovernanceData {
    return {
      governanceEvents: [
        {
          scope: 'project-alpha',
          eventType: 'budget_breach',
          payloadJson: JSON.stringify({ taskKey: 'T-1', overage: 12.5 }),
          createdAt: frozen.getTime() - 1000 * 60 * 5,
        },
        {
          scope: 'project-beta',
          eventType: 'budget_breach',
          payloadJson: JSON.stringify({}),
          createdAt: frozen.getTime() - 1000 * 60 * 60 * 2,
        },
        {
          scope: 'project-gamma',
          eventType: 'other',
          payloadJson: JSON.stringify({}),
          createdAt: frozen.getTime(),
        },
      ],
      reconciliationEvents: [
        {
          projectSlug: 'alpha',
          artifactType: 'task',
          artifactId: 'T-1',
          divergenceType: 'hash_mismatch',
          conductorHash: 'abc',
          canonicalHash: 'def',
          description: 'Task hash differs',
          counter: 1,
          createdAt: frozen.getTime() - 1000 * 60 * 60 * 24,
        },
      ],
      policyWeights: [
        {
          name: 'default',
          weightsJson: JSON.stringify({ cost: 0.5, speed: 0.3 }),
          version: 3,
          createdAt: frozen.getTime() - 1000 * 60 * 60 * 24 * 3,
        },
        {
          name: 'broken',
          weightsJson: 'not-json',
          version: 1,
          createdAt: frozen.getTime() - 1000 * 60 * 60 * 24 * 10,
        },
      ],
    }
  }

  it('renders loading state', () => {
    render(<Governance data={undefined} loading />)
    expect(screen.getByText('Loading governance data...')).toBeInTheDocument()
  })

  it('renders drift events', () => {
    render(<Governance data={getMockData()} />)

    expect(screen.getByText('1 divergence(s) detected')).toBeInTheDocument()
    expect(screen.getByText('task: T-1')).toBeInTheDocument()
    expect(screen.getByText('Task hash differs')).toBeInTheDocument()
    expect(screen.getByText('hash_mismatch')).toBeInTheDocument()
  })

  it('renders empty drift state', () => {
    render(<Governance data={{ ...getMockData(), reconciliationEvents: [] }} />)
    expect(screen.getByText('No drift events')).toBeInTheDocument()
  })

  it('renders budget breaches with payload details', () => {
    render(<Governance data={getMockData()} />)

    expect(screen.getByText('2 breach(s) this period')).toBeInTheDocument()
    expect(screen.getByText('project-alpha')).toBeInTheDocument()
    expect(screen.getByText('Task: T-1')).toBeInTheDocument()
    expect(screen.getByText('+12.50 over budget')).toBeInTheDocument()
    expect(screen.getByText('project-beta')).toBeInTheDocument()
    expect(screen.getByText('5m ago')).toBeInTheDocument()
    expect(screen.getByText('2h ago')).toBeInTheDocument()
  })

  it('renders empty budget breach state', () => {
    render(<Governance data={{ ...getMockData(), governanceEvents: [] }} />)
    expect(screen.getByText('No budget breaches')).toBeInTheDocument()
  })

  it('renders policy versions with weight count', () => {
    render(<Governance data={getMockData()} />)

    expect(screen.getByText('2 version(s) tracked')).toBeInTheDocument()
    expect(screen.getByText('default')).toBeInTheDocument()
    expect(screen.getByText('v3 · 2 weight(s)')).toBeInTheDocument()
    expect(screen.getByText('broken')).toBeInTheDocument()
    expect(screen.getByText('v1 · 0 weight(s)')).toBeInTheDocument()
  })

  it('renders empty policy versions state', () => {
    render(<Governance data={{ ...getMockData(), policyWeights: [] }} />)
    expect(screen.getByText('No policy changes')).toBeInTheDocument()
  })

  it('renders "just now" timestamp', () => {
    const data: GovernanceData = {
      ...getMockData(),
      governanceEvents: [
        {
          scope: 'now-test',
          eventType: 'budget_breach',
          payloadJson: '{}',
          createdAt: frozen.getTime() - 1000 * 30,
        },
      ],
    }
    render(<Governance data={data} />)
    expect(screen.getByText('just now')).toBeInTheDocument()
  })

  it('renders older date when beyond 7 days', () => {
    const data: GovernanceData = {
      ...getMockData(),
      policyWeights: [
        {
          name: 'old',
          weightsJson: '{}',
          version: 1,
          createdAt: new Date('2026-04-01T00:00:00Z').getTime(),
        },
      ],
    }
    render(<Governance data={data} />)
    expect(screen.getByText('4/1/2026')).toBeInTheDocument()
  })
})
