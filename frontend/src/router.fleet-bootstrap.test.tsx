import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/lib/toast'

const {
  mockGetSliceConfig,
  mockUseConvexAgentsTransformed,
  mockUseConvexHarnessesTransformed,
  mockUseConvexProjectsTransformed,
} = vi.hoisted(() => ({
  mockGetSliceConfig: vi.fn(),
  mockUseConvexAgentsTransformed: vi.fn(),
  mockUseConvexHarnessesTransformed: vi.fn(),
  mockUseConvexProjectsTransformed: vi.fn(),
}))

vi.mock('./lib/useConvexData', () => ({
  useConvexProjectsTransformed: mockUseConvexProjectsTransformed,
  useConvexAgentsTransformed: mockUseConvexAgentsTransformed,
  useConvexHarnessesTransformed: mockUseConvexHarnessesTransformed,
}))

vi.mock('./lib/dataAdapter', () => ({
  getSliceConfig: mockGetSliceConfig,
}))

const BUN_SOURCES = {
  projects: 'bun',
  agents: 'bun',
  harnesses: 'bun',
  tasks: 'bun',
  issues: 'bun',
  logs: 'bun',
  settings: 'bun',
} as const

const selectedProject = {
  id: 'project-reading-advantage',
  slug: 'reading-advantage-llm-benchmark',
  name: 'Reading Advantage LLM Benchmark',
  path: '/workspace/reading-advantage-llm-benchmark',
  tracks: [],
  lastUpdated: 1,
}

function jsonResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as Response
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('FleetLayout bootstrap readiness', () => {
  beforeEach(() => {
    mockGetSliceConfig.mockReturnValue(BUN_SOURCES)
    mockUseConvexProjectsTransformed.mockReturnValue(null)
    mockUseConvexAgentsTransformed.mockReturnValue(null)
    mockUseConvexHarnessesTransformed.mockReturnValue(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('renders a direct Quality project selection while agents and harnesses are still pending', async () => {
    const pendingAgents = deferred<Response>()
    const pendingHarnesses = deferred<Response>()
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/health') return Promise.resolve(jsonResponse({ message: 'OK' }))
      if (url === '/api/projects') return Promise.resolve(jsonResponse([selectedProject]))
      if (url === '/api/agents') return pendingAgents.promise
      if (url === '/api/harnesses') return pendingHarnesses.promise
      if (url === '/api/quality/profiles') {
        return Promise.resolve(
          jsonResponse([
            { name: 'none', version: 1, kind: 'none', description: 'No workflow', stages: [] },
          ]),
        )
      }
      if (url === `/api/quality/projects/${selectedProject.slug}/profile`) {
        return Promise.resolve(
          jsonResponse({ profileName: 'none', profileVersion: 1, source: 'default' }),
        )
      }
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { routes } = await import('./router')
    const router = createMemoryRouter(routes, {
      initialEntries: [`/settings/quality?project=${selectedProject.slug}&source=direct`],
    })
    render(
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>,
    )

    const projectSelector = await screen.findByRole('combobox', { name: 'Project' })
    expect(projectSelector).toHaveValue(selectedProject.slug)
    expect(router.state.location.pathname).toBe('/settings/quality')
    expect(router.state.location.search).toBe(`?project=${selectedProject.slug}&source=direct`)
    expect(fetchMock).toHaveBeenCalledWith('/api/projects')
    expect(fetchMock).toHaveBeenCalledWith('/api/agents')
    expect(fetchMock).toHaveBeenCalledWith('/api/harnesses')
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Quality workflow' })).toBeVisible(),
    )
  })
})
