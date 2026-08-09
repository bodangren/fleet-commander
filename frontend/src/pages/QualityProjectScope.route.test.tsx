import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'

import { ToastProvider } from '@/lib/toast'
import type { FleetDataState } from '@/lib/useFleetData'
import { routes } from '@/router'

const { mockUseFleetData } = vi.hoisted(() => ({ mockUseFleetData: vi.fn() }))

vi.mock('@/lib/useFleetData', () => ({
  useFleetData: () => mockUseFleetData(),
}))

const benchmarkProjectSlug = 'reading-advantage-llm-benchmark'

const multiProjectFleet = {
  healthStatus: 'Backend Status: ok',
  projects: [
    {
      id: 'other-project',
      slug: 'other-project',
      name: 'Other Project',
      path: '/workspace/other-project',
      tracks: [],
      lastUpdated: 0,
    },
    {
      id: 'benchmark-project',
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

function jsonResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as Response
}

function stubQualityFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url === '/api/quality/profiles') {
      return jsonResponse([
        { name: 'none', version: 1, kind: 'none', description: 'No workflow', stages: [] },
      ])
    }
    if (url === `/api/quality/projects/${benchmarkProjectSlug}/profile`) {
      return jsonResponse({ profileName: 'none', profileVersion: 1, source: 'default' })
    }
    if (url.startsWith('/api/quality/runs?')) return jsonResponse([])
    throw new Error(`Unexpected quality request: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderProductionRoute(path: string) {
  const memoryRouter = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <ToastProvider>
      <RouterProvider router={memoryRouter} />
    </ToastProvider>,
  )
  return memoryRouter
}

describe('quality project selection routes', () => {
  beforeEach(() => {
    mockUseFleetData.mockReturnValue(multiProjectFleet)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it.each([
    ['/settings/quality', 'Quality workflow'],
    ['/ops/quality', 'Quality operations'],
  ])('requires an explicit project before rendering %s panel', async (path, panelHeading) => {
    const fetchMock = stubQualityFetch()

    await renderProductionRoute(path)

    expect(await screen.findByRole('combobox', { name: 'Project' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: panelHeading })).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reveals the project selector after fleet bootstrap resolves on a direct quality route', async () => {
    const fetchMock = stubQualityFetch()
    mockUseFleetData.mockReturnValue({ ...multiProjectFleet, projectsLoading: true })
    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ['/settings/quality'],
    })
    const view = render(
      <ToastProvider>
        <RouterProvider router={memoryRouter} />
      </ToastProvider>,
    )

    // The data router first resolves the lazy settings modules; only then can
    // the Quality page render its fleet-bootstrap loading state.
    expect(await screen.findByText('Loading imported projects...')).toBeInTheDocument()

    mockUseFleetData.mockReturnValue(multiProjectFleet)
    view.rerender(
      <ToastProvider>
        <RouterProvider key="fleet-ready" router={memoryRouter} />
      </ToastProvider>,
    )

    expect(await screen.findByRole('combobox', { name: 'Project' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('selects the benchmark project from Settings, preserves the query, and loads its quality panel', async () => {
    const fetchMock = stubQualityFetch()
    const memoryRouter = await renderProductionRoute('/settings/quality?source=live-core')

    const projectSelect = await screen.findByRole('combobox', { name: 'Project' })
    await userEvent.setup().selectOptions(projectSelect, benchmarkProjectSlug)

    await waitFor(() => {
      const search = new URLSearchParams(memoryRouter.state.location.search)
      expect(search.get('project')).toBe(benchmarkProjectSlug)
      expect(search.get('source')).toBe('live-core')
    })
    expect(await screen.findByRole('heading', { name: 'Quality workflow' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(`/api/quality/projects/${benchmarkProjectSlug}/profile`)
  })

  it('honors a benchmark project slug already present in the Ops Quality URL', async () => {
    stubQualityFetch()
    const memoryRouter = await renderProductionRoute(
      `/ops/quality?project=${encodeURIComponent(benchmarkProjectSlug)}`,
    )

    expect(await screen.findByRole('combobox', { name: 'Project' })).toHaveValue(
      benchmarkProjectSlug,
    )
    expect(memoryRouter.state.location.search).toBe(`?project=${benchmarkProjectSlug}`)
    expect(await screen.findByText(`Project: ${benchmarkProjectSlug}`)).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Quality operations' })).toBeInTheDocument()
  })
})
