import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const { mockRefresh } = vi.hoisted(() => ({
  mockRefresh: vi.fn(async () => {}),
}))

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
    refresh: mockRefresh,
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
  }),
}))

vi.mock('@/lib/useLogStream', () => ({
  useLogStream: () => ({
    lines: [],
    connected: false,
    clearLines: vi.fn(() => {}),
    executionStatuses: new Map(),
    getTaskStatus: vi.fn(() => undefined),
  }),
}))

import { AppRoutes } from '@/App'

describe('AppRoutes', () => {
  beforeEach(() => {
    mockRefresh.mockClear()
  })

  it('renders the agents route', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter
        initialEntries={['/agents']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Agents' })).toBeInTheDocument()
    expect(await screen.findByText('The agent registry is empty.')).toBeInTheDocument()
    expect(screen.queryByText('Loading agent registry...')).not.toBeInTheDocument()
    expect(screen.queryByText(/Unable to load agent registry:/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(mockRefresh).toHaveBeenCalledOnce()
  })

  it('renders the analytics route', async () => {
    render(
      <MemoryRouter
        initialEntries={['/analytics']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'Analytics' })).toBeInTheDocument()
  })

  it('renders the performance route', async () => {
    render(
      <MemoryRouter
        initialEntries={['/performance']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Performance' }),
    ).toBeInTheDocument()
  })

  it('renders the costs route', async () => {
    render(
      <MemoryRouter
        initialEntries={['/costs']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'Costs' })).toBeInTheDocument()
  })
})

/**
 * Phase 2 (package_dependency_upgrades_20260607) — Characterization tests for
 * the React Router security-update surface.
 *
 * The `App` root wraps the route tree in `BrowserRouter` with the v7 future
 * flags already enabled (`v7_startTransition`, `v7_relativeSplatPath`). These
 * tests pin the contract that the wildcard catch-all redirect and the
 * parameterized routes continue to resolve correctly after a React Router
 * 6.x security/patch upgrade. They are characterization, not speculative:
 * every assertion reflects behaviour that already exists in `App.tsx`.
 *
 * To avoid coupling these tests to data-loading state of the rendered pages,
 * the parameterized-route assertions use `AppLayout`'s topbar title — a pure
 * function of `useLocation().pathname` — as the route-resolved marker. This
 * keeps the assertions stable across data hooks and is the closest in-process
 * proxy for "did the route actually match".
 *
 * test-strategy.md § Cross-Phase Edge Cases — "React Router 6 → 7 (Phase 4)":
 * 28 Playwright specs depend on navigation; these Vitest tests are the
 * pre-upgrade unit-level guard for the in-process routing contract.
 */
describe('AppRoutes — Phase 2: routing security-update characterization', () => {
  it('renders a recoverable 404 for an unknown route', async () => {
    render(
      <MemoryRouter
        initialEntries={['/this-route-does-not-exist']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByText('/this-route-does-not-exist')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Portfolio' })).toBeInTheDocument()
  })

  it('resolves /agents/leaderboard to the LeaderboardPage (topbar title "Leaderboard")', async () => {
    render(
      <MemoryRouter
        initialEntries={['/agents/leaderboard']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AppRoutes />
      </MemoryRouter>,
    )

    // The topbar's title is derived from useLocation().pathname. If the
    // parameterized segment /agents/:slug does not match, the route falls
    // through to the wildcard redirect at "/" (topbar → "Dashboard").
    expect(await screen.findByText('Leaderboard', { selector: 'span' })).toBeInTheDocument()
  })

  it('resolves /tasks/:taskId/timeline to the TaskTimelinePage (topbar title "Task Timeline")', async () => {
    render(
      <MemoryRouter
        initialEntries={['/tasks/TASK-42/timeline']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Task Timeline', { selector: 'span' })).toBeInTheDocument()
  })

  it('resolves /agent-templates/:id/edit to the editor (topbar title "Template Editor")', async () => {
    render(
      <MemoryRouter
        initialEntries={['/agent-templates/some-template-id/edit']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Template Editor', { selector: 'span' })).toBeInTheDocument()
  })

  it('resolves /agents/:name/edit to the AgentEditorPage (topbar title "Agent Editor")', async () => {
    render(
      <MemoryRouter
        initialEntries={['/agents/some-agent/edit']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Agent Editor', { selector: 'span' })).toBeInTheDocument()
  })
})
