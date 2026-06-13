import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'

/**
 * Phase S3 (STORY-R3) regression guard: rendering at `/settings` in a
 * data-router must resolve to the AppConfigSection (via the production
 * `router.tsx` index `Navigate to="/settings/app" replace` contract), not
 * fall through the catch-all `*` route to `/`.
 *
 * The sibling `SettingsLayout.test.tsx` file mocks the `Outlet` symbol to
 * isolate the layout's own concerns (sidebar nav, active state, Outlet
 * presence). That mock is incompatible with the route-level integration
 * test we need here, so this file lives next to it as a focused regression
 * guard for the index-redirect contract.
 *
 * Source: measure/tracks/route_fixes_regression_20260613/plan.md §S3,
 * measure/tracks/route_fixes_regression_20260613/test-strategy.md §5.
 */

vi.mock('@/lib/useFleetData', () => ({
  useFleetData: () => ({
    healthStatus: 'Backend Status: ok',
    projects: [],
    agents: [],
    harnesses: [],
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
    useNotificationPreferences: vi.fn(() => undefined),
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

function stubFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/settings') {
        return Promise.resolve({ ok: true, json: async () => JSON.parse(settingsJson) })
      }
      if (url === '/api/agents') {
        return Promise.resolve({ ok: true, json: async () => JSON.parse('[]') })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    }),
  )
}

async function renderProductionRouterAt(path: string) {
  const { router } = await import('@/router')
  const memoryRouter = createMemoryRouter(router.routes, { initialEntries: [path] })
  return render(<RouterProvider router={memoryRouter} />)
}

describe('SettingsLayout route — /settings index redirect (STORY-R3)', () => {
  beforeEach(() => {
    stubFetch()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the AppConfigSection when /settings is requested (not a redirect to /)', async () => {
    await renderProductionRouterAt('/settings')
    // AppConfigSection's initial loading state is "Loading settings...".
    // If the /settings index Navigate target is correct, this text appears.
    // If the redirect falls through to the catch-all `*` → Navigate to "/",
    // the portfolio page renders instead and this text is absent.
    await waitFor(() =>
      expect(screen.getByText('Loading settings...')).toBeInTheDocument(),
    )
  })

  it('replaces the URL to /settings/app after the index redirect fires', async () => {
    // The Navigate is declared with `replace`, so the history entry is
    // rewritten. window.location is NOT updated by createMemoryRouter in
    // jsdom, so we read the resolved pathname straight from the router
    // state after the redirect settles.
    const { router } = await import('@/router')
    const memoryRouter = createMemoryRouter(router.routes, { initialEntries: ['/settings'] })
    render(<RouterProvider router={memoryRouter} />)
    await waitFor(() =>
      expect(screen.getByText('Loading settings...')).toBeInTheDocument(),
    )
    // The regression guard catches a future `push`-style change or a
    // redirect to a different target (e.g., /settings/notifications).
    await waitFor(() =>
      expect(memoryRouter.state.location.pathname).toBe('/settings/app'),
    )
  })

  it('does not render the catch-all PortfolioRedirect page at /settings', async () => {
    await renderProductionRouterAt('/settings')
    await waitFor(() =>
      expect(screen.getByText('Loading settings...')).toBeInTheDocument(),
    )
    // The catch-all route at router.tsx:127 redirects to "/". The portfolio
    // page mounts a hero heading — assert it is absent at /settings so a
    // future misconfiguration that falls through to "*" is caught.
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })
})
