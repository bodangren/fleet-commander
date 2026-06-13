import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'

/**
 * Phase S7 (STORY-R7) regression guard: rendering at `/history/agents` in
 * the production data-router must resolve to `AgentsHistoryPage`, not
 * fall through the catch-all `*` route to `/`. The S1 Green commit
 * `c9766df` fixed the underlying API path constant (`HISTORY_AGENTS_API`)
 * but did not add a route-level guard — the sibling
 * `AgentsHistoryPage.test.tsx` only mounts the page body directly inside a
 * `MemoryRouter`, which cannot detect a regression to `router.tsx:125`
 * (path drop, path rename, or component swap). This file mirrors the
 * S5 sibling `TasksHistoryPage.route.test.tsx` regression-guard shape.
 *
 * Source: measure/tracks/route_fixes_regression_20260613/plan.md §S7,
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

import {
  setupConvexMocks,
  setMockConvexData,
  resetMockConvexData,
} from '@/__fixtures__/convex-provider'
import { mockAgentHistory } from '@/__fixtures__/historyFixtures'

setupConvexMocks()

async function renderProductionRouterAt(path: string) {
  const { router } = await import('@/router')
  const memoryRouter = createMemoryRouter(router.routes, { initialEntries: [path] })
  const result = render(<RouterProvider router={memoryRouter} />)
  return { memoryRouter, ...result }
}

describe('AgentsHistoryPage route — /history/agents regression guard (STORY-R7)', () => {
  beforeEach(() => {
    resetMockConvexData()
  })
  afterEach(() => {
    resetMockConvexData()
  })

  it('renders the AgentsHistoryPage heading at /history/agents (not the catch-all portfolio page)', async () => {
    setMockConvexData({ agentHistory: mockAgentHistory })
    const { memoryRouter } = await renderProductionRouterAt('/history/agents')

    // Target the page-level <h2> heading. The AppLayout topbar also
    // renders the active view title, so a heading-role query with the
    // explicit level disambiguates between the topbar caption and the
    // page-content heading.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Agent History', level: 2 })).toBeInTheDocument(),
    )
    expect(memoryRouter.state.location.pathname).toBe('/history/agents')
  })

  it('renders AgentPerformanceTable rows when useAgentHistory returns data', async () => {
    setMockConvexData({ agentHistory: mockAgentHistory })
    await renderProductionRouterAt('/history/agents')

    // Proves the S1 API path fix (HISTORY_AGENTS_API) is observable
    // end-to-end: the table receives the mocked agent items and renders
    // their display names.
    await waitFor(() => expect(screen.getAllByText('Alice').length).toBeGreaterThan(0))
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0)
  })

  it('does not redirect /history/agents to / (catch-all route guard)', async () => {
    setMockConvexData({ agentHistory: mockAgentHistory })
    const { memoryRouter } = await renderProductionRouterAt('/history/agents')

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Agent History', level: 2 })).toBeInTheDocument(),
    )
    // The catch-all `*` route at router.tsx:127 sends unknown URLs to
    // "/". A future change that drops the history/agents route would
    // trigger that fallback — this assertion catches it.
    expect(memoryRouter.state.location.pathname).not.toBe('/')
  })

  it('renders the loading indicator when useAgentHistory returns undefined', async () => {
    setMockConvexData({ agentHistory: undefined })
    await renderProductionRouterAt('/history/agents')

    // The page distinguishes "loading" (undefined) from "empty" ([]).
    // A regression that treats undefined as "no data" would render the
    // "No agent history" empty state instead — this assertion catches
    // that.
    expect(screen.getByText('Loading agent history…')).toBeInTheDocument()
    expect(screen.queryByText('No agent history')).not.toBeInTheDocument()
  })

  it('renders the timeout error message when useAgentHistory is undefined past the loading timeout', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      setMockConvexData({ agentHistory: undefined })
      await renderProductionRouterAt('/history/agents')

      // The page uses useLoadingTimeout(10000) — advance virtual time
      // past 10s so the error message replaces the loading indicator.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_500)
      })

      await waitFor(() =>
        expect(screen.getByText(/unable to load agent history/i)).toBeInTheDocument(),
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('STORY-R7 AC: timeout-error path keeps the URL at /history/agents (not a redirect to /settings, /profile, or /)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      setMockConvexData({ agentHistory: undefined })
      const { memoryRouter } = await renderProductionRouterAt('/history/agents')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_500)
      })

      await waitFor(() =>
        expect(screen.getByText(/unable to load agent history/i)).toBeInTheDocument(),
      )

      // Tighter contract anchored to the STORY-R7 audit clause "all new
      // tests pass + no regression to a redirect on the error path".
      expect(memoryRouter.state.location.pathname).toBe('/history/agents')
      expect(memoryRouter.state.location.pathname).not.toBe('/')
      expect(memoryRouter.state.location.pathname).not.toBe('/settings')
      expect(memoryRouter.state.location.pathname).not.toBe('/settings/app')
      expect(memoryRouter.state.location.pathname).not.toBe('/settings/profile')
      expect(memoryRouter.state.location.pathname).not.toBe('/profile')
    } finally {
      vi.useRealTimers()
    }
  })
})
