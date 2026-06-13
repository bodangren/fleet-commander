import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'

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
import { mockTaskHistory } from '@/__fixtures__/historyFixtures'

setupConvexMocks()

async function renderProductionRouterAt(path: string) {
  const { router } = await import('@/router')
  const memoryRouter = createMemoryRouter(router.routes, { initialEntries: [path] })
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
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Task History', level: 2 })).toBeInTheDocument(),
    )
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
    await waitFor(() => expect(screen.getByText('Fix auth bug')).toBeInTheDocument())
    expect(screen.getByText('Add dashboard chart')).toBeInTheDocument()
    expect(screen.getByText('Optimize queries')).toBeInTheDocument()
  })

  it('does not redirect /history/tasks to / (catch-all route guard)', async () => {
    setMockConvexData({ taskHistory: mockTaskHistory })
    const { memoryRouter } = await renderProductionRouterAt('/history/tasks')

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Task History', level: 2 })).toBeInTheDocument(),
    )
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
    expect(screen.getByText('Loading task history…')).toBeInTheDocument()
    expect(screen.queryByText('No task history')).not.toBeInTheDocument()
  })

  it('renders the timeout error message when useTaskHistory is undefined past the loading timeout', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      setMockConvexData({ taskHistory: undefined })
      await renderProductionRouterAt('/history/tasks')

      // The page uses useLoadingTimeout(10000) — advance virtual time
      // past 10s so the error message replaces the loading indicator.
      // The R5 spec AC requires "a timeout error message appears (not a
      // redirect to Settings/Profile)" when Convex is unavailable.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_500)
      })

      await waitFor(() =>
        expect(
          screen.getByText(/unable to load task history/i),
        ).toBeInTheDocument(),
      )
    } finally {
      vi.useRealTimers()
    }
  })
})
