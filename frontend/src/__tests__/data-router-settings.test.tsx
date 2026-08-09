import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'

import { routes } from '@/router'

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

vi.mock('@/lib/useConvexData', async importOriginal => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    useConvexProjectsTransformed: vi.fn(() => []),
    useConvexAgentsTransformed: vi.fn(() => []),
    useConvexHarnessesTransformed: vi.fn(() => []),
  }
})

const settingsJson = JSON.stringify({
  general: { defaultAgent: 'senior-frontend', orchestratorInterval: 30, logRetentionDays: 7 },
  providers: { cacheTTL: 300 },
  websocket: { reconnectInterval: 5000 },
})

const agentsJson = JSON.stringify([
  { definition: { name: 'senior-frontend', description: 'Senior Frontend' } },
  { definition: { name: 'executor', description: 'Executor' } },
])

function stubFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/settings') {
        return Promise.resolve({ ok: true, json: async () => JSON.parse(settingsJson) })
      }
      if (url === '/api/agents') {
        return Promise.resolve({ ok: true, json: async () => JSON.parse(agentsJson) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    }),
  )
}

function renderProductionRouterAt(path: string) {
  const memoryRouter = createMemoryRouter(routes, { initialEntries: [path] })
  return render(<RouterProvider router={memoryRouter} />)
}

describe('production data-router — settings subtree runtime contract', () => {
  beforeEach(() => {
    stubFetch()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('redirects /settings to the app settings section', async () => {
    await renderProductionRouterAt('/settings')
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())
  })

  it('resolves /settings/app to the app settings section', async () => {
    await renderProductionRouterAt('/settings/app')
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())
  })

  it('resolves /settings/agents to the agent defaults section', async () => {
    await renderProductionRouterAt('/settings/agents')
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 3, name: 'Agent Defaults' })).toBeInTheDocument(),
    )
  })

  it('resolves /settings/profile to the profile section', async () => {
    await renderProductionRouterAt('/settings/profile')
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 3, name: 'Profile' })).toBeInTheDocument(),
    )
  })
})

describe('settings subtree matches production router.tsx', () => {
  it('declares settings child routes with relative paths, not absolute /settings/* paths', async () => {
    const findSettings = (routeTree: typeof routes): typeof routes => {
      for (const route of routeTree) {
        if (route.path === 'settings' && route.children) return route.children
        if (route.children) {
          const nested = findSettings(route.children)
          if (nested.length) return nested
        }
      }
      return []
    }

    const settingsChildren = findSettings(routes)
    const childPaths = settingsChildren
      .map(c => c.path)
      .filter((p): p is string => typeof p === 'string')

    expect(childPaths).toEqual(expect.arrayContaining(['app', 'agents', 'profile']))
    for (const p of childPaths) {
      expect(p.startsWith('settings/')).toBe(false)
    }
  })
})
