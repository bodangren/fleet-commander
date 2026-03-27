import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import { AgentsPage } from './AgentsPage'
import type { FleetDataState } from '@/lib/useFleetData'

const fleet = {
  healthStatus: 'Backend Status: ok',
  projects: [],
  agents: [
    {
      layer: 'user',
      definition: {
        name: 'Senior Backend',
        description: 'Builds backend services',
        mode: 'agent',
        model: 'codex-cli/codex-1',
        temperature: 0.2,
        tools: {
          write: true,
          edit: true,
          bash: true,
        },
        body: 'Backend prompt.',
      },
    },
  ],
  harnesses: [],
  loading: false,
  error: null,
  refresh: vi.fn(async () => {}),
  busyAgent: null,
  busyHarness: null,
  agentTestResult: {
    name: 'Senior Backend',
    status: 'success',
    latencyMs: 123,
    output: 'OK',
  },
  harnessDiscoveryResult: null,
  testAgent: vi.fn(async () => {}),
  testHarnessDiscovery: vi.fn(async () => {}),
} satisfies FleetDataState

describe('AgentsPage', () => {
  it('renders the agent list and the latest test result', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AgentsPage fleet={fleet} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Senior Backend')).toBeInTheDocument()
    expect(screen.getByText('Builds backend services')).toBeInTheDocument()
    expect(screen.getByText('Agent Test: Senior Backend')).toBeInTheDocument()
    expect(screen.getByText('123 ms')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add Agent' })).toHaveAttribute(
      'href',
      '/agents/new/edit',
    )
  })
})
