import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FleetDataState } from '@/lib/useFleetData'
import type { PortfolioProject } from '@/hooks/usePortfolioData'

const { mockUseConvexQuery, mockUseFleetData } = vi.hoisted(() => ({
  mockUseConvexQuery: vi.fn(),
  mockUseFleetData: vi.fn(),
}))

vi.mock('@/lib/dataAdapter', () => ({
  getSliceConfig: () => ({
    projects: 'convex',
    agents: 'convex',
    harnesses: 'convex',
    tasks: 'convex',
    issues: 'convex',
    logs: 'convex',
    settings: 'convex',
  }),
}))

vi.mock('@/lib/convex-data/core', () => ({
  useConvexQuery: mockUseConvexQuery,
}))

vi.mock('@/lib/useFleetData', () => ({
  useFleetData: () => mockUseFleetData(),
}))

const benchmarkProjectSlug = 'reading-advantage-llm-benchmark'
const benchmarkProjectId = 'project-reading-advantage'

const multiProjectFleet = {
  healthStatus: 'Backend Status: ok',
  projects: [
    {
      id: 'project-other',
      slug: 'other-project',
      name: 'Other Project',
      path: '/workspace/other-project',
      tracks: [],
      lastUpdated: 0,
    },
    {
      id: benchmarkProjectId,
      slug: benchmarkProjectSlug,
      name: 'Reading Advantage LLM Benchmark',
      path: '/workspace/reading-advantage-llm-benchmark',
      tracks: [],
      lastUpdated: 0,
    },
  ],
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
  refresh: vi.fn(async () => {}),
  refreshProjects: vi.fn(async () => {}),
  refreshAgents: vi.fn(async () => {}),
  refreshHarnesses: vi.fn(async () => {}),
  refreshHealth: vi.fn(async () => {}),
  busyAgent: null,
  busyHarness: null,
  agentTestResult: null,
  harnessDiscoveryResult: null,
  testAgent: vi.fn(async () => {}),
  testHarnessDiscovery: vi.fn(async () => {}),
} satisfies FleetDataState

const portfolioProjects = [
  {
    _id: 'project-other',
    slug: 'other-project',
    name: 'Other Project',
    description: '',
    totalSprints: 0,
    lastSprint: null,
    totalSpend: 0,
    health: 'green',
    healthReason: 'Loaded from API',
  },
  {
    _id: benchmarkProjectId,
    slug: benchmarkProjectSlug,
    name: 'Reading Advantage LLM Benchmark',
    description: '',
    totalSprints: 0,
    lastSprint: null,
    totalSpend: 0,
    health: 'green',
    healthReason: 'Loaded from API',
  },
] satisfies PortfolioProject[]

const importedHistoryTask = {
  _id: 'history-task-reading-advantage',
  projectId: benchmarkProjectId,
  title: 'Task: Full test suite and build',
  description: 'Imported benchmark task',
  status: 'done',
  priority: 'medium',
  projectSlug: benchmarkProjectSlug,
  costEstimate: 25,
  actualCost: 7.5,
  storyPoints: 3,
  createdAt: 100,
  updatedAt: 200,
}

function isEnabledHistoryQuery(queryName: unknown, enabled: unknown): boolean {
  return typeof queryName === 'string' && queryName.startsWith('history/') && enabled === true
}

function stubHistoryQueries() {
  mockUseConvexQuery.mockImplementation(
    (queryName: string, args: Record<string, unknown>, enabled: boolean) => {
      if (queryName === 'portfolio:getPortfolioHandler') return portfolioProjects
      if (!enabled || args.projectId !== benchmarkProjectId) return undefined
      if (queryName === 'history/sprints:listSprintHistoryHandler') return []
      if (queryName === 'history/tasks:listTaskHistoryHandler') return [importedHistoryTask]
      return undefined
    },
  )
}

async function renderProductionRoute(path: string) {
  const { router } = await import('@/router')
  const memoryRouter = createMemoryRouter(router.routes, { initialEntries: [path] })
  render(<RouterProvider router={memoryRouter} />)
  return memoryRouter
}

describe('History project scope routes', () => {
  beforeEach(() => {
    mockUseFleetData.mockReturnValue(multiProjectFleet)
    stubHistoryQueries()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('keeps Sprint History unscoped until a project is chosen, then loads the selected project', async () => {
    const memoryRouter = await renderProductionRoute('/history/sprints?source=secondary-live')

    const projectSelect = await screen.findByRole('combobox', { name: 'Project' })
    expect(projectSelect).toHaveValue('')
    expect(screen.queryByText('No sprint history')).not.toBeInTheDocument()
    expect(
      mockUseConvexQuery.mock.calls.some(([queryName, , enabled]) =>
        isEnabledHistoryQuery(queryName, enabled),
      ),
    ).toBe(false)

    await userEvent.setup().selectOptions(projectSelect, benchmarkProjectSlug)

    await waitFor(() => {
      const search = new URLSearchParams(memoryRouter.state.location.search)
      expect(search.get('project')).toBe(benchmarkProjectSlug)
      expect(search.get('source')).toBe('secondary-live')
    })
    expect(await screen.findByText('No sprint history')).toBeInTheDocument()
    expect(mockUseConvexQuery).toHaveBeenCalledWith(
      'history/sprints:listSprintHistoryHandler',
      { projectId: benchmarkProjectId, limit: 50 },
      true,
    )
  })

  it('keeps Task History unscoped until a project is chosen, then renders selected-project rows', async () => {
    const memoryRouter = await renderProductionRoute('/history/tasks')

    const projectSelect = await screen.findByRole('combobox', { name: 'Project' })
    expect(projectSelect).toHaveValue('')
    expect(screen.queryByText(importedHistoryTask.title)).not.toBeInTheDocument()
    expect(
      mockUseConvexQuery.mock.calls.some(([queryName, , enabled]) =>
        isEnabledHistoryQuery(queryName, enabled),
      ),
    ).toBe(false)

    await userEvent.setup().selectOptions(projectSelect, benchmarkProjectSlug)

    await waitFor(() => {
      expect(memoryRouter.state.location.search).toBe(`?project=${benchmarkProjectSlug}`)
    })
    expect(await screen.findByText(importedHistoryTask.title)).toBeInTheDocument()
    expect(mockUseConvexQuery).toHaveBeenCalledWith(
      'history/tasks:listTaskHistoryHandler',
      {
        projectId: benchmarkProjectId,
        status: undefined,
        search: undefined,
        limit: 50,
      },
      true,
    )
  })
})
