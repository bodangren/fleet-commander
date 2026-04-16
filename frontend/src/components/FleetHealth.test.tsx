import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { FleetHealth, FleetHealthData } from './FleetHealth'

describe('FleetHealth', () => {
  const mockDispatchStats = [
    {
      persona: 'executor',
      taskKind: 'feature',
      repoType: 'default',
      meanDurationMs: 120000,
      p50Cost: 0.8,
      p90Cost: 0.95,
      reviewFailRate: 0.1,
      retryRate: 0.05,
      blockerCreationRate: 0.02,
      coverageRegressionRate: 0.01,
      sampleCount: 25,
      windowDays: 7,
      insufficientData: false,
      lastUpdatedAt: Date.now(),
    },
    {
      persona: 'reviewer',
      taskKind: 'bug',
      repoType: 'default',
      meanDurationMs: 30000,
      p50Cost: 0.5,
      p90Cost: 0.7,
      reviewFailRate: 0.2,
      retryRate: 0.1,
      blockerCreationRate: 0.0,
      coverageRegressionRate: 0.0,
      sampleCount: 10,
      windowDays: 7,
      insufficientData: false,
      lastUpdatedAt: Date.now(),
    },
    {
      persona: 'executor',
      taskKind: 'bug',
      repoType: 'default',
      meanDurationMs: 0,
      p50Cost: 0,
      p90Cost: 0,
      reviewFailRate: 0,
      retryRate: 0,
      blockerCreationRate: 0,
      coverageRegressionRate: 0,
      sampleCount: 3,
      windowDays: 7,
      insufficientData: true,
      lastUpdatedAt: Date.now(),
    },
  ]

  const mockHarnessStats = [
    {
      harnessName: 'opencode',
      successRate7d: 0.92,
      medianLatencyMs: 45000,
      averageTokens: 850,
      reviewPassRateByTaskClassJson: JSON.stringify({ feature: 0.9, bug: 0.85, chore: 0.95 }),
      topFailureModesJson: JSON.stringify(['retry', 'escalate']),
      lastUpdatedAt: Date.now(),
    },
  ]

  const mockData: FleetHealthData = {
    dispatchStats: mockDispatchStats,
    harnessStats: mockHarnessStats,
  }

  it('renders dispatch policy stats table', () => {
    render(<FleetHealth data={mockData} />)

    expect(screen.getAllByText('executor').length).toBeGreaterThan(0)
    expect(screen.getAllByText('feature').length).toBeGreaterThan(0)
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('reviewer')).toBeInTheDocument()
    expect(screen.getAllByText('bug').length).toBeGreaterThan(0)
  })

  it('renders harness reliability stats', () => {
    render(<FleetHealth data={mockData} />)

    expect(screen.getByText('opencode')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()
    expect(screen.getByText('45s')).toBeInTheDocument()
  })

  it('sorts dispatch stats by column when header is clicked', () => {
    render(<FleetHealth data={mockData} />)

    const sampleHeader = screen.getByRole('button', { name: /samples/i })
    fireEvent.click(sampleHeader)
    expect(screen.getByTestId('dispatch-row-0')).toHaveTextContent('3')

    fireEvent.click(sampleHeader)
    expect(screen.getByTestId('dispatch-row-0')).toHaveTextContent('25')
  })

  it('marks insufficient data rows', () => {
    render(<FleetHealth data={mockData} />)

    const insufficientBadge = screen.getByText('(insufficient data)')
    expect(insufficientBadge).toBeInTheDocument()
  })

  it('renders loading state', () => {
    render(<FleetHealth data={undefined} loading />)

    expect(screen.getByText('Loading fleet health...')).toBeInTheDocument()
  })

  it('renders empty state when no data', () => {
    render(<FleetHealth data={{ dispatchStats: [], harnessStats: [] }} />)

    expect(screen.getByText('No dispatch policy data')).toBeInTheDocument()
    expect(screen.getByText('No harness data')).toBeInTheDocument()
  })
})
