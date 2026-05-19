import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DashboardPage } from './DashboardPage'
import type { FleetDataState } from '@/lib/useFleetData'

const fleet = {
  healthStatus: 'Backend Status: ok',
  projects: [],
  agents: [],
  harnesses: [],
  loading: false,
  error: null,
  refresh: vi.fn(async () => {}),
  busyAgent: null,
  busyHarness: null,
  agentTestResult: null,
  harnessDiscoveryResult: null,
  testAgent: vi.fn(async () => {}),
  testHarnessDiscovery: vi.fn(async () => {}),
} satisfies FleetDataState

describe('DashboardPage', () => {
  it('renders the dashboard with sprint status and metrics', () => {
    render(<DashboardPage fleet={fleet} lines={[]} connected={false} />)

    expect(screen.getByText('Sprint 14')).toBeInTheDocument()
    expect(screen.getByText('Key Metrics')).toBeInTheDocument()
    expect(screen.getByText('Agent Status')).toBeInTheDocument()
    expect(screen.getByText('Attention Needed')).toBeInTheDocument()
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
  })

  it('renders sprint status details', () => {
    render(<DashboardPage fleet={fleet} lines={[]} connected={false} />)

    expect(screen.getByText('Points Delivered')).toBeInTheDocument()
    expect(screen.getByText('Cost/Point')).toBeInTheDocument()
    expect(screen.getByText('Tasks Complete')).toBeInTheDocument()
    expect(screen.getByText('Budget Remaining')).toBeInTheDocument()
  })

  it('renders key metrics', () => {
    render(<DashboardPage fleet={fleet} lines={[]} connected={false} />)

    expect(screen.getByText('Delivery Rate')).toBeInTheDocument()
    expect(screen.getByText('Success Rate')).toBeInTheDocument()
    expect(screen.getByText('Avg Pipeline Time')).toBeInTheDocument()
    expect(screen.getByText('Rejection Rate')).toBeInTheDocument()
  })
})
