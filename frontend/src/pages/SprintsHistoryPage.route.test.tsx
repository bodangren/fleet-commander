import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'

/**
 * Phase S7 (STORY-R7) regression guard: rendering at `/history/sprints`
 * in the production data-router must resolve to `SprintsHistoryPage`,
 * not fall through the catch-all `*` route to `/`. The S1 Green commit
 * `c9766df` fixed the underlying API path constant (`HISTORY_SPRINTS_API`)
 * but did not add a route-level guard — the sibling
 * `SprintsHistoryPage.test.tsx` only mounts the page body directly inside
 * a `MemoryRouter`, which cannot detect a regression to `router.tsx:124`
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

import {
  setupConvexMocks,
  setMockConvexData,
  resetMockConvexData,
} from '@/__fixtures__/convex-provider'
import { mockSprintHistory } from '@/__fixtures__/historyFixtures'

setupConvexMocks()

async function renderProductionRouterAt(path: string) {
  const { router } = await import('@/router')
  const memoryRouter = createMemoryRouter(router.routes, { initialEntries: [path] })
  const result = render(<RouterProvider router={memoryRouter} />)
  return { memoryRouter, ...result }
}

describe('SprintsHistoryPage route — /history/sprints regression guard (STORY-R7)', () => {
  beforeEach(() => {
    resetMockConvexData()
  })
  afterEach(() => {
    resetMockConvexData()
  })

  it('renders the SprintsHistoryPage heading at /history/sprints (not the catch-all portfolio page)', async () => {
    setMockConvexData({ sprintHistory: mockSprintHistory })
    const { memoryRouter } = await renderProductionRouterAt('/history/sprints')

    // Target the page-level <h2> heading. The AppLayout topbar may also
    // render the view title; a heading-role query with the explicit
    // level disambiguates between the topbar caption and the page
    // heading.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Sprint History', level: 2 })).toBeInTheDocument(),
    )
    expect(memoryRouter.state.location.pathname).toBe('/history/sprints')
  })

  it('renders SprintHistoryTable rows when useSprintHistory returns data', async () => {
    setMockConvexData({ sprintHistory: mockSprintHistory })
    await renderProductionRouterAt('/history/sprints')

    // Proves the S1 API path fix (HISTORY_SPRINTS_API) is observable
    // end-to-end: the table receives the mocked sprint items and renders
    // their names.
    await waitFor(() => expect(screen.getAllByText('Sprint 1').length).toBeGreaterThan(0))
    expect(screen.getAllByText('Sprint 2').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sprint 3').length).toBeGreaterThan(0)
  })

  it('does not redirect /history/sprints to / (catch-all route guard)', async () => {
    setMockConvexData({ sprintHistory: mockSprintHistory })
    const { memoryRouter } = await renderProductionRouterAt('/history/sprints')

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Sprint History', level: 2 })).toBeInTheDocument(),
    )
    // The catch-all `*` route at router.tsx:127 sends unknown URLs to
    // "/". A future change that drops the history/sprints route would
    // trigger that fallback — this assertion catches it.
    expect(memoryRouter.state.location.pathname).not.toBe('/')
  })

  it('renders the loading indicator when useSprintHistory returns undefined', async () => {
    setMockConvexData({ sprintHistory: undefined })
    await renderProductionRouterAt('/history/sprints')

    // The page distinguishes "loading" (undefined) from "empty" ([]).
    // A regression that treats undefined as "no data" would render the
    // "No sprint history" empty state instead — this assertion catches
    // that.
    expect(screen.getByText('Loading sprint history…')).toBeInTheDocument()
    expect(screen.queryByText('No sprint history')).not.toBeInTheDocument()
  })

  it('renders the timeout error message when useSprintHistory is undefined past the loading timeout', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      setMockConvexData({ sprintHistory: undefined })
      await renderProductionRouterAt('/history/sprints')

      // The page uses useLoadingTimeout(10000) — advance virtual time
      // past 10s so the error message replaces the loading indicator.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_500)
      })

      await waitFor(() =>
        expect(screen.getByText(/unable to load sprint history/i)).toBeInTheDocument(),
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('STORY-R7 AC: timeout-error path keeps the URL at /history/sprints (not a redirect to /settings, /profile, or /)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      setMockConvexData({ sprintHistory: undefined })
      const { memoryRouter } = await renderProductionRouterAt('/history/sprints')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_500)
      })

      await waitFor(() =>
        expect(screen.getByText(/unable to load sprint history/i)).toBeInTheDocument(),
      )

      // Tighter contract anchored to the STORY-R7 audit clause "all new
      // tests pass + no regression to a redirect on the error path".
      expect(memoryRouter.state.location.pathname).toBe('/history/sprints')
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
