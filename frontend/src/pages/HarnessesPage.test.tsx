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
        name: 'Claude Code',
        binary: 'claude',
        discovery: {
          command: 'claude --help',
          parseStrategy: 'regex',
          pattern: 'claude-(\\S+)',
        },
        invocation: {
          template: 'claude --model {model} --prompt {prompt}',
          flags: {},
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
    name: 'Claude Code',
    models: ['claude-3.5'],
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

    expect(screen.getByText('Claude Code')).toBeInTheDocument()
    expect(screen.getByText('claude')).toBeInTheDocument()
    expect(screen.getByText('Discovery: Claude Code')).toBeInTheDocument()
    expect(screen.getByText('claude-3.5')).toBeInTheDocument()
  })
})
