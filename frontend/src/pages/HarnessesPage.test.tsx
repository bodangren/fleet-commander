import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { HarnessesPage } from './HarnessesPage'
import type { FleetDataState } from '@/lib/useFleetData'

const fleet = {
  healthStatus: 'Backend Status: ok',
  projects: [],
  agents: [],
  harnesses: [
    {
      layer: 'bundled',
      binaryFound: true,
      definition: {
        name: 'Opencode',
        binary: 'opencode',
        discovery: {
          command: 'opencode models',
          parseStrategy: 'line-per-model',
          pattern: '',
        },
        invocation: {
          template: 'opencode -m {model} run "{prompt}"',
          flags: { no_interactive: '--no-interactive' },
        },
      },
    },
  ],
  loading: false,
  error: null,
  refresh: vi.fn(async () => {}),
  busyAgent: null,
  busyHarness: null,
  agentTestResult: null,
  harnessDiscoveryResult: {
    name: 'Opencode',
    models: ['anthropic/claude-sonnet-4-6'],
  },
  testAgent: vi.fn(async () => {}),
  testHarnessDiscovery: vi.fn(async () => {}),
} satisfies FleetDataState

describe('HarnessesPage', () => {
  it('renders the harness list and discovery results', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <HarnessesPage fleet={fleet} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Opencode')).toBeInTheDocument()
    expect(screen.getByText('opencode')).toBeInTheDocument()
    expect(screen.getByText('Discovery: Opencode')).toBeInTheDocument()
    expect(screen.getByText('anthropic/claude-sonnet-4-6')).toBeInTheDocument()
  })
})
