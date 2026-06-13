import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { HarnessesPage } from './HarnessesPage'
import type { FleetDataState } from '@/lib/useFleetData'

vi.mock('@/lib/useFleetData', () => ({
  useFleetData: () => ({
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
          discovery: { command: 'opencode models', parseStrategy: 'line-per-model', pattern: '' },
          invocation: { template: 'opencode -m {model} run "{prompt}"', flags: {} },
        },
      },
    ],
    loading: false,
    error: null,
    refresh: vi.fn(),
    busyAgent: null,
    busyHarness: null,
    agentTestResult: null,
    harnessDiscoveryResult: null,
    testAgent: vi.fn(),
    testHarnessDiscovery: vi.fn(),
  }),
}))

vi.mock('@/lib/useConvexData', async importOriginal => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    useConvexProjectsTransformed: vi.fn(() => []),
    useConvexAgentsTransformed: vi.fn(() => []),
    useConvexHarnessesTransformed: vi.fn(() => []),
  }
})

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

  it('renders empty state when harnesses array is empty', () => {
    const emptyFleet = { ...fleet, harnesses: [] }
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <HarnessesPage fleet={emptyFleet} />
      </MemoryRouter>,
    )

    expect(screen.getByText('The harness registry is empty or failed to load.')).toBeInTheDocument()
  })
})

describe('HarnessesPageWrapper via production router (STORY-R4)', () => {
  it('renders HarnessesPage at /harnesses when fleet data is available', async () => {
    const { router } = await import('@/router')
    const { createMemoryRouter, RouterProvider } = await import('react-router-dom')
    const memoryRouter = createMemoryRouter(router.routes, { initialEntries: ['/harnesses'] })
    render(<RouterProvider router={memoryRouter} />)

    await waitFor(() => expect(screen.getByText('Harness Registry')).toBeInTheDocument())
  })
})
