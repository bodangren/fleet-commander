import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'

import { routes } from '@/router'

/**
 * Phase S5 (STORY-R5) regression guard: rendering at `/history/tasks` in
 * the production data-router must resolve to `TasksHistoryPage`, not fall
 * through the catch-all `*` route to `/` (which is what QA reported as
 * "the /history/tasks route redirects").
 *
 * The sibling `TasksHistoryPage.test.tsx` file exercises the page body
 * directly inside a `MemoryRouter`. That unit-style mount does not prove
 * the route config at `router.tsx:126` (`path: 'history/tasks', element:
 * <TasksHistoryPage />`) is wired up — a future regression that removes
 * the route or changes its path would not be caught. This file lives next
 * to it as a focused regression guard for the route-level contract.
 *
 * Source: measure/tracks/route_fixes_regression_20260613/plan.md §S5,
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
import { mockTaskHistory } from '@/__fixtures__/historyFixtures'

setupConvexMocks()

function renderProductionRouterAt(path: string) {
  const memoryRouter = createMemoryRouter(routes, { initialEntries: [path] })
  const result = render(<RouterProvider router={memoryRouter} />)
  return { memoryRouter, ...result }
}

describe('TasksHistoryPage route — /history/tasks regression guard (STORY-R5)', () => {
  beforeEach(() => {
    resetMockConvexData()
  })
  afterEach(() => {
    resetMockConvexData()
  })

  it('renders the TasksHistoryPage heading at /history/tasks (not the catch-all portfolio page)', async () => {
    setMockConvexData({ taskHistory: mockTaskHistory })
    const { memoryRouter } = await renderProductionRouterAt('/history/tasks')

    // Target the page-level <h2> heading rather than the global text —
    // AppLayout's topbar also renders "Task History" (see viewTitle in
    // AppLayout.tsx:163) so a plain getByText would fail with a
    // multiple-elements error. A heading-role query disambiguates.
    expect(
      await screen.findByRole('heading', { name: 'Task History', level: 2 }),
    ).toBeInTheDocument()
    // The portfolio index/catch-all page has no such heading, so its
    // presence proves <TasksHistoryPage /> mounted and the catch-all
    // `*` did not fire.
    expect(memoryRouter.state.location.pathname).toBe('/history/tasks')
  })

  it('renders TaskHistoryTable rows when useTaskHistory returns data', async () => {
    setMockConvexData({ taskHistory: mockTaskHistory })
    await renderProductionRouterAt('/history/tasks')

    // Proves the S1 API path fix is observable end-to-end: the table
    // receives the mocked task items and renders their titles.
    expect(await screen.findByText('Fix auth bug')).toBeInTheDocument()
    expect(screen.getByText('Add dashboard chart')).toBeInTheDocument()
    expect(screen.getByText('Optimize queries')).toBeInTheDocument()
  })

  it('does not redirect /history/tasks to / (catch-all route guard)', async () => {
    setMockConvexData({ taskHistory: mockTaskHistory })
    const { memoryRouter } = await renderProductionRouterAt('/history/tasks')

    expect(
      await screen.findByRole('heading', { name: 'Task History', level: 2 }),
    ).toBeInTheDocument()
    // The catch-all `*` route at router.tsx:127 sends unknown URLs to
    // "/". A future change that drops the history/tasks route would
    // trigger that fallback — this assertion catches it.
    expect(memoryRouter.state.location.pathname).not.toBe('/')
  })

  it('renders the loading indicator when useTaskHistory returns undefined', async () => {
    setMockConvexData({ taskHistory: undefined })
    await renderProductionRouterAt('/history/tasks')

    // The page distinguishes "loading" (undefined) from "empty" ([]).
    // A regression that treats undefined as "no data" would render the
    // "No task history" empty state instead — this assertion catches
    // that.
    expect(await screen.findByText('Loading task history…')).toBeInTheDocument()
    expect(screen.queryByText('No task history')).not.toBeInTheDocument()
  })

  it('renders the timeout error message when useTaskHistory is undefined past the loading timeout', async () => {
    vi.useFakeTimers()
    try {
      setMockConvexData({ taskHistory: undefined })
      renderProductionRouterAt('/history/tasks')

      await act(async () => {
        await vi.dynamicImportSettled()
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_500)
      })

      expect(screen.getByText(/unable to load task history/i)).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('STORY-R5 AC: timeout-error path keeps the URL at /history/tasks (not a redirect to /settings, /profile, or /)', async () => {
    vi.useFakeTimers()
    try {
      setMockConvexData({ taskHistory: undefined })
      const { memoryRouter } = renderProductionRouterAt('/history/tasks')

      await act(async () => {
        await vi.dynamicImportSettled()
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_500)
      })

      expect(screen.getByText(/unable to load task history/i)).toBeInTheDocument()

      // Tighter contract for the R5 spec AC clause "not a redirect to
      // Settings/Profile". The earlier test (#3) guards against the
      // catch-all `/` redirect on the data path; this test guards
      // against a *navigated* redirect on the error path. Any of these
      // URLs would mean the R5 AC was violated.
      expect(memoryRouter.state.location.pathname).toBe('/history/tasks')
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
