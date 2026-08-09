import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { HarnessesPage } from './HarnessesPage'
import type { FleetDataState } from '@/lib/useFleetData'
import { routes } from '@/router'

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
          name: 'minimax-cn-coding-plan',
          binary: 'pi',
          discovery: {
            command: 'pi --list-models',
            parseStrategy: 'pi-roster',
            pattern: 'minimax-cn-coding-plan/*',
          },
          invocation: {
            template: 'pi --model {model} --mode json -p {prompt}',
            flags: { readiness: 'pi --list-models {model}' },
          },
        },
      },
    ],
    loading: false,
    error: null,
    projectsLoading: false,
    projectsError: null,
    agentsLoading: false,
    agentsError: null,
    harnessesLoading: false,
    harnessesError: null,
    healthLoading: false,
    healthError: null,
    refresh: vi.fn(),
    refreshProjects: vi.fn(),
    refreshAgents: vi.fn(),
    refreshHarnesses: vi.fn(),
    refreshHealth: vi.fn(),
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
        name: 'minimax-cn-coding-plan',
        binary: 'pi',
        discovery: {
          command: 'pi --list-models',
          parseStrategy: 'pi-roster',
          pattern: 'minimax-cn-coding-plan/*',
        },
        invocation: {
          template: 'pi --model {model} --mode json -p {prompt}',
          flags: { readiness: 'pi --list-models {model}' },
        },
      },
    },
  ],
  loading: false,
  error: null,
  projectsLoading: false,
  projectsError: null,
  agentsLoading: false,
  agentsError: null,
  harnessesLoading: false,
  harnessesError: null,
  healthLoading: false,
  healthError: null,
  refresh: vi.fn(async () => {}),
  refreshProjects: vi.fn(async () => {}),
  refreshAgents: vi.fn(async () => {}),
  refreshHarnesses: vi.fn(async () => {}),
  refreshHealth: vi.fn(async () => {}),
  busyAgent: null,
  busyHarness: null,
  agentTestResult: null,
  harnessDiscoveryResult: {
    name: 'minimax-cn-coding-plan',
    models: ['MiniMax-M3'],
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

    expect(screen.getByText('minimax-cn-coding-plan')).toBeInTheDocument()
    expect(screen.getByText('pi')).toBeInTheDocument()
    expect(screen.getByText('Pi catalog entry — read-only.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.getByText('Discovery: minimax-cn-coding-plan')).toBeInTheDocument()
    expect(screen.getByText('MiniMax-M3')).toBeInTheDocument()
  })

  it('renders loading state before an empty harness response settles', () => {
    const loadingFleet = { ...fleet, harnesses: [], harnessesLoading: true }
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <HarnessesPage fleet={loadingFleet} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Loading Pi provider catalog...')).toBeInTheDocument()
    expect(screen.queryByText('No Pi providers are configured.')).not.toBeInTheDocument()
  })

  it('renders a distinct error state after a failed harness response', () => {
    const failedFleet = { ...fleet, harnesses: [], harnessesError: 'Backend unavailable' }
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <HarnessesPage fleet={failedFleet} />
      </MemoryRouter>,
    )

    expect(
      screen.getByText('Unable to load Pi provider catalog: Backend unavailable'),
    ).toBeInTheDocument()
    expect(screen.queryByText('No Pi providers are configured.')).not.toBeInTheDocument()
  })

  it('renders the settled empty state when the catalog is empty', () => {
    const emptyFleet = { ...fleet, harnesses: [] }
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <HarnessesPage fleet={emptyFleet} />
      </MemoryRouter>,
    )

    expect(screen.getByText('No Pi providers are configured.')).toBeInTheDocument()
  })
})

describe('HarnessesPageWrapper via production router (STORY-R4)', () => {
  it('renders HarnessesPage at /harnesses when fleet data is available', async () => {
    const { createMemoryRouter, RouterProvider } = await import('react-router-dom')
    const memoryRouter = createMemoryRouter(routes, { initialEntries: ['/harnesses'] })
    render(<RouterProvider router={memoryRouter} />)

    await waitFor(() => expect(screen.getByText('Pi Provider Catalog')).toBeInTheDocument())
  })

  it.each(['/harnesses/new', '/harnesses/minimax-cn-coding-plan/edit'])(
    'redirects the removed editor route %s to the read-only catalog',
    async path => {
      const { createMemoryRouter, RouterProvider } = await import('react-router-dom')
      const memoryRouter = createMemoryRouter(routes, { initialEntries: [path] })
      render(<RouterProvider router={memoryRouter} />)

      await waitFor(() => expect(screen.getByText('Pi Provider Catalog')).toBeInTheDocument())
      expect(memoryRouter.state.location.pathname).toBe('/harnesses')
      expect(screen.queryByText(/New Harness|Edit Harness:/)).not.toBeInTheDocument()
    },
  )
})
