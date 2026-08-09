import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PortfolioProject } from '@/hooks/usePortfolioData'
import { routes } from '@/router'

const { mockUsePortfolioData } = vi.hoisted(() => ({ mockUsePortfolioData: vi.fn() }))

vi.mock('@/lib/useFleetData', () => ({
  useFleetData: () => ({
    healthStatus: 'Backend Status: ok',
    projects: [],
    agents: [],
    harnesses: [],
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

vi.mock('@/hooks/usePortfolioData', async importOriginal => {
  const actual = await importOriginal<typeof import('@/hooks/usePortfolioData')>()
  return {
    ...actual,
    usePortfolioData: () => mockUsePortfolioData(),
  }
})

const importedProjects: PortfolioProject[] = [
  {
    _id: 'project-a',
    name: 'Imported benchmark',
    slug: 'reading-advantage-llm-benchmark',
    description: 'Imported benchmark workspace',
    totalSprints: 0,
    lastSprint: null,
    totalSpend: 0,
    health: 'green',
    healthReason: 'Loaded from API',
  },
  {
    _id: 'project-b',
    name: 'Second imported project',
    slug: 'second-imported-project',
    description: 'A second workspace makes the root route ambiguous',
    totalSprints: 0,
    lastSprint: null,
    totalSpend: 0,
    health: 'green',
    healthReason: 'Loaded from API',
  },
]

function renderProductionRouterAt(path: string) {
  const memoryRouter = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={memoryRouter} />)
  return memoryRouter
}

describe('dashboard route contract', () => {
  beforeEach(() => {
    mockUsePortfolioData.mockReturnValue({
      projects: importedProjects,
      projectParam: null,
      refresh: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('sends an ambiguous root route to Portfolio when more than one project exists', async () => {
    const memoryRouter = await renderProductionRouterAt('/')

    await waitFor(() => expect(memoryRouter.state.location.pathname).toBe('/portfolio'))
    expect(screen.getByRole('heading', { name: 'All Projects' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'No Active Sprint' })).not.toBeInTheDocument()
  })

  it('resolves /dashboard directly without consulting the root redirect', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          sprint: null,
          tasks: [],
          agents: [],
          pipelineRuns: [],
          alerts: [],
          metrics: {
            deliveryRate: 0,
            successRate: 0,
            avgPipelineTime: 0,
            rejectionRate: 0,
          },
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const memoryRouter = await renderProductionRouterAt('/dashboard')

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'No Active Sprint' })).toBeInTheDocument(),
    )
    expect(memoryRouter.state.location.pathname).toBe('/dashboard')
    expect(fetchMock).toHaveBeenCalledWith('/api/dashboard', { signal: expect.any(AbortSignal) })
  })
})
