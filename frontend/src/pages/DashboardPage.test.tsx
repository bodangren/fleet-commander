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
  it('renders the onboarding screen when no projects are registered', () => {
    render(<DashboardPage fleet={fleet} lines={[]} connected={false} />)

    expect(screen.getByText('Bring a workspace into Fleet Commander.')).toBeInTheDocument()
    expect(screen.getByLabelText('Workspace Root')).toBeInTheDocument()
  })
})
