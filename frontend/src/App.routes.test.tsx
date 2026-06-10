/**
 * Phase 4: Delete God-File + Wire Routes — route-table wiring contract.
 *
 * Spec: measure/tracks/settings_page_refactor_20260610/spec.md
 * Plan: measure/tracks/settings_page_refactor_20260610/plan.md (Phase 4)
 * Test strategy: measure/tracks/settings_page_refactor_20260610/test-strategy.md §5
 *
 * The Phase 4 contract is that all four planned settings sub-routes resolve
 * inside `<AppRoutes>` and that the legacy `SettingsPage` god-file is gone.
 * The components landed in Phase 3 (`AppConfigSection`,
 * `NotificationSettingsSection`, `AgentDefaultsSection`,
 * `ProfileSettingsSection`) — the route entries for `agents` and `profile`
 * were explicitly deferred to Phase 4 (plan.md Phase 3 evidence, line 242).
 *
 * Each test renders `<AppRoutes>` in a `<MemoryRouter>` against a fresh
 * initial entry and asserts the resulting DOM contract. Stubbing `fetch`
 * and the Convex-backed `useNotificationPreferences` hook keeps the tests
 * stable without depending on the network or a real Convex deployment.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

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

vi.mock('@/lib/useLogStream', () => ({
  useLogStream: () => ({
    lines: [],
    connected: false,
    clearLines: vi.fn(),
    executionStatuses: new Map(),
    getTaskStatus: vi.fn(),
  }),
}))

vi.mock('@/lib/useConvexData', async importOriginal => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    useNotificationPreferences: vi.fn(() => undefined),
  }
})

import { AppRoutes } from '@/App'

/**
 * Render `<AppRoutes>` in a memory router at the supplied initial entry.
 * `fetch` is stubbed with a controlled resolver so the settings sections
 * (`AppConfigSection`, `AgentDefaultsSection`) do not hit the network.
 */
function renderAt(path: string) {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AppRoutes />
    </MemoryRouter>,
  )
}

const settingsJson = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    general: { defaultAgent: 'senior-frontend', orchestratorInterval: 30, logRetentionDays: 7 },
    providers: { cacheTTL: 300 },
    websocket: { reconnectInterval: 5000 },
    ...overrides,
  })

const agentsJson = JSON.stringify([
  { definition: { name: 'senior-frontend', description: 'Senior Frontend' } },
  { definition: { name: 'executor', description: 'Executor' } },
])

function stubFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === '/api/settings') {
        return Promise.resolve({ ok: true, json: async () => JSON.parse(settingsJson()) })
      }
      if (url === '/api/agents') {
        return Promise.resolve({ ok: true, json: async () => JSON.parse(agentsJson) })
      }
      return Promise.reject(new Error(`Unexpected fetch URL in test: ${url}`))
    }),
  )
}

describe('AppRoutes — Phase 4: settings route table wiring', () => {
  beforeEach(() => {
    stubFetch()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('redirects /settings to /settings/app via the index Navigate', async () => {
    renderAt('/settings')
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())
    expect(screen.getByText('Settings', { selector: 'span' })).toBeInTheDocument()
  })

  it('resolves /settings/app to the AppConfigSection (General card)', async () => {
    renderAt('/settings/app')
    // AppConfigSection uses <CardTitle>General</CardTitle> for the first card
    // after settings load. The test waits for the fetch to resolve.
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())
  })

  it('resolves /settings/notifications to the NotificationSettingsSection', async () => {
    renderAt('/settings/notifications')
    // NotificationSettingsSection renders a <CardTitle>Notifications</CardTitle>
    // inside the AppLayout's <main> outlet. The sidebar also carries a
    // "Notifications" link to the (unrelated) /notifications history page,
    // so the assertion is scoped to <main> to disambiguate.
    await waitFor(() => {
      const main = document.querySelector('main')
      expect(main).not.toBeNull()
      expect(main!.textContent).toContain('Notifications')
    })
  })

  it('resolves /settings/agents to the AgentDefaultsSection', async () => {
    renderAt('/settings/agents')
    // AgentDefaultsSection renders <h3>Agent Defaults</h3> as the card title.
    // If the /settings/agents route entry is missing in App.tsx the
    // AppRoutes tree falls through to the wildcard redirect, which lands
    // on PortfolioRedirect (not AgentDefaultsSection) and this assertion
    // fails — that is the Phase 4 Red signal for the missing route entry.
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 3, name: 'Agent Defaults' })).toBeInTheDocument(),
    )
  })

  it('resolves /settings/profile to the ProfileSettingsSection', async () => {
    renderAt('/settings/profile')
    // ProfileSettingsSection renders <h3>Profile</h3> as the card title.
    // Same Red signal as the agents route above: missing route entry in
    // App.tsx means the wildcard catches the URL and the heading is
    // never rendered.
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 3, name: 'Profile' })).toBeInTheDocument(),
    )
  })

  it('shows the Settings topbar title for every /settings sub-route', async () => {
    const subRoutes = [
      ['/settings/app', 'General'],
      ['/settings/notifications', 'Notifications'],
      ['/settings/agents', 'Agent Defaults'],
      ['/settings/profile', 'Profile'],
    ] as const

    for (const [subRoute, sectionText] of subRoutes) {
      const { unmount } = renderAt(subRoute)
      expect(await screen.findByText('Settings', { selector: 'span' })).toBeInTheDocument()
      await waitFor(() => {
        const main = document.querySelector('main')
        expect(main).not.toBeNull()
        expect(main!.textContent).toContain(sectionText)
      })
      unmount()
    }
  })
})
