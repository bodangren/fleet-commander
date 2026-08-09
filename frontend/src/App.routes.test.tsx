/**
 * Phase 4: Delete God-File + Wire Routes — route-table wiring contract.
 *
 * Spec: measure/tracks/settings_page_refactor_20260610/spec.md
 * Plan: measure/tracks/settings_page_refactor_20260610/plan.md (Phase 4)
 * Test strategy: measure/tracks/settings_page_refactor_20260610/test-strategy.md §5
 *
 * The Phase 4 contract is that the supported settings sub-routes resolve
 * inside `<AppRoutes>` and that the legacy `SettingsPage` god-file is gone.
 * The components landed in Phase 3 (`AppConfigSection`,
 * `AgentDefaultsSection`, `ProfileSettingsSection`) — the route entries for
 * `agents` and `profile`
 * were explicitly deferred to Phase 4 (plan.md Phase 3 evidence, line 242).
 *
 * Each test renders `<AppRoutes>` in a `<MemoryRouter>` against a fresh
 * initial entry and asserts the resulting DOM contract. Stubbing `fetch`
 * keeps the tests stable without depending on the network.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, resolve, sep } from 'node:path'

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

vi.mock('@/lib/useLogStream', () => ({
  useLogStream: () => ({
    lines: [],
    connected: false,
    clearLines: vi.fn(),
    executionStatuses: new Map(),
    getTaskStatus: vi.fn(),
  }),
}))

/**
 * Render at the supplied initial entry using the production data-router
 * via `createMemoryRouter`. `fetch` is stubbed with a controlled resolver
 * so the settings sections (`AppConfigSection`, `AgentDefaultsSection`)
 * do not hit the network.
 */
async function renderAt(path: string) {
  const memoryRouter = createMemoryRouter(routes, { initialEntries: [path] })
  const rendered = render(<RouterProvider router={memoryRouter} />)

  // Nested lazy routes load the settings layout and section in sequence.
  // Settle each import generation instead of depending on the default
  // Testing Library timeout or file execution order.
  for (let pass = 0; pass < 4 && !memoryRouter.state.initialized; pass += 1) {
    await act(async () => {
      await vi.dynamicImportSettled()
    })
  }
  expect(memoryRouter.state.initialized).toBe(true)

  return rendered
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
    await renderAt('/settings')
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())
    expect(screen.getByText('Settings', { selector: 'span' })).toBeInTheDocument()
  })

  it('resolves /settings/app to the AppConfigSection (General card)', async () => {
    await renderAt('/settings/app')
    // AppConfigSection uses <CardTitle>General</CardTitle> for the first card
    // after settings load. The test waits for the fetch to resolve.
    await waitFor(() => expect(screen.getByText('General')).toBeInTheDocument())
  })

  it('resolves /settings/agents to the AgentDefaultsSection', async () => {
    await renderAt('/settings/agents')
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
    await renderAt('/settings/profile')
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
      ['/settings/agents', 'Agent Defaults'],
      ['/settings/profile', 'Profile'],
    ] as const

    for (const [subRoute, sectionText] of subRoutes) {
      const { unmount } = await renderAt(subRoute)
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

/**
 * Phase 2: Route Migration — Red tests for sub-tasks 2.1–2.4.
 *
 * Spec:  measure/tracks/react_router_7_migration_20260611/spec.md
 * Plan:  measure/tracks/react_router_7_migration_20260611/plan.md (Phase 2)
 * Strategy: measure/tracks/react_router_7_migration_20260611/test-strategy.md §4, §7
 *
 * Per the strategy §4 "live source proof" allowance, these are
 * source-presence / source-absence tests on the production files. The
 * deliverable for Phase 2 is the data-router configuration (a code
 * artifact) — not a markdown file or a test-only harness. The "rendering
 * via the new data-router and asserting resolved pathnames" proof is
 * owned by the Green role + Phase 3 closeout gate (strategy §7 Phase 3
 * row). The Red tests guard the code-artifact contract; Phase 3 exercises
 * the same paths on the real data-router.
 *
 * Test-strategy §7 Red commands (one `-t` filter per sub-task):
 *   2.1 → `-t "Phase 2.1"`
 *   2.2 → `-t "Phase 2.2"`
 *   2.3 → `-t "Phase 2.3"`
 *   2.4 → `-t "Phase 2.4"`
 *
 * Each describe block uses a unique filterable substring so the targeted
 * Red command (one sub-task at a time, no full-suite fall-through) is
 * bounded. The `*.test.*` exclusion in the future-flag scan (2.4) and
 * the `loader`/`action` guard (test-strategy §4) keep the test files
 * themselves out of scope: removing future flags from production code is
 * the contract, not removing them from test wrappers that explicitly opt
 * into v6 future behavior to keep the existing characterization tests
 * green.
 */

const REPO_ROOT_FOR_SRC = resolve(__dirname, '../..')
const SRC_ROOT = join(REPO_ROOT_FOR_SRC, 'frontend/src')
const APP_TSX_PATH = join(SRC_ROOT, 'App.tsx')
const ROUTER_TSX_PATH = join(SRC_ROOT, 'router.tsx')
const BLOCKERS_TSX_PATH = join(SRC_ROOT, 'pages/BlockersPage.tsx')
const VITE_CONFIG_PATH = join(REPO_ROOT_FOR_SRC, 'frontend/vite.config.ts')

/**
 * The full set of v6→v7 future flags that React Router 6x accepts and
 * that must be removed in v7 (where they are on-by-default). Mirrored
 * from the React Router v6 `FutureConfig` type.
 */
const V7_FUTURE_FLAGS = [
  'v7_startTransition',
  'v7_relativeSplatPath',
  'v7_fetcherPersist',
  'v7_normalizeFormMethod',
  'v7_partialHydration',
  'v7_skipActionErrorRevalidation',
] as const

/**
 * Recursively list `.ts`/`.tsx` files under `dir`, excluding test files
 * (`*.test.{ts,tsx}`, `*.test-helpers.{ts,tsx}`). Used by the future-flag
 * scan (Task 2.4) to scope the assertion to non-test source only.
 */
function listNonTestSourceFiles(dir: string): string[] {
  const out: string[] = []
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const s = statSync(full)
    if (s.isDirectory()) {
      out.push(...listNonTestSourceFiles(full))
    } else if (/\.tsx?$/.test(extname(name)) && !/\.test\./.test(name)) {
      out.push(full)
    }
  }
  return out
}

/**
 * Return true if `routerSource` declares a route whose `path:` (or
 * `path =`) value matches `path`. Tolerates optional leading `/` so the
 * data-router tree can use relative paths under a layout parent
 * (`path: 'agents'`) or absolute paths under a flat structure
 * (`path: '/agents'`), and tolerates single/double/backtick quotes.
 */
function routerHasPath(routerSource: string, path: string): boolean {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Match `path: 'x'`, `path: "/x"`, or `path: \`x\`` — quote-agnostic,
  // slash-optional, and the whole value must be the path (no trailing
  // concatenation).
  const re = new RegExp(`path\\s*:\\s*['"\`]\\/?${escaped}['"\`]`)
  return re.test(routerSource)
}

/**
 * Return true if `routerSource` declares an `index: true` route. The
 * data-router replaces `<Route index ...>` with `{ index: true, ... }`.
 */
function routerHasIndex(routerSource: string): boolean {
  return /index\s*:\s*true\b/.test(routerSource)
}

describe('AppRoutes — Phase 2.1: top-level data-router conversion', () => {
  it('App.tsx default export renders <RouterProvider> with the production router', () => {
    const app = readFileSync(APP_TSX_PATH, 'utf8')
    // Green-shape: `import { router } from './router'` (or '@/router') and
    // `<RouterProvider router={router}>` inside the default export.
    expect(app).toMatch(/<RouterProvider\b/)
    expect(app).toMatch(/from\s+['"](\.\/router|@\/router)['"]/)
  })

  it('App.tsx no longer uses <BrowserRouter>, <Routes>, or <Route JSX', () => {
    const app = readFileSync(APP_TSX_PATH, 'utf8')
    // JSX form. The closing `>` is required to avoid matching attribute
    // substrings like `<Route>`. `<Routes` and `<Route ` and `<BrowserRouter`
    // are the v6 opening tags we must not emit.
    expect(app).not.toMatch(/<BrowserRouter\b[^>]*>/)
    expect(app).not.toMatch(/<Routes\b[^>]*>/)
    expect(app).not.toMatch(/<Route\b[^>]*>/)
  })

  it('App.tsx does not import BrowserRouter, Routes, or Route from react-router-dom', () => {
    const app = readFileSync(APP_TSX_PATH, 'utf8')
    const importMatch = app.match(/import\s*\{([^}]+)\}\s*from\s*['"]react-router-dom['"]/)
    expect(importMatch, 'App.tsx should have a named import from react-router-dom').not.toBeNull()
    const imports = (importMatch![1] ?? '')
      .split(',')
      .map(s => s.trim().split(/\s+as\s+/)[0] ?? '')
      .filter(Boolean)
    for (const legacy of ['BrowserRouter', 'Routes', 'Route']) {
      expect(
        imports,
        `App.tsx should not import legacy "${legacy}" from react-router-dom — uses data-router <RouterProvider> instead`,
      ).not.toContain(legacy)
    }
  })

  it('router.tsx source contains every top-level browser route from the inventory', () => {
    const router = readFileSync(ROUTER_TSX_PATH, 'utf8')
    // Top-level browser routes (non-parameterized, no children other than
    // `/settings/*`, asserted in 2.2). Catch-all `*` is the
    // redirect-to-`/` fallback.
    //
    // This list is maintained against router.tsx itself. It used to be
    // pinned to an inventory.md inside an archived track, which meant any
    // deliberate route change failed the test for the wrong reason.
    // 'pipelines' was removed when the dead YAML pipeline engine went.
    const topLevelPaths = [
      'portfolio',
      'agents',
      'agent-templates',
      'templates',
      'providers',
      'settings',
      'analytics',
      'performance',
      'costs',
      'ops',
      'sprint-planning',
      'board',
      'retrospectives',
      'blockers',
      'alerts',
      'history/sprints',
      'history/agents',
      'history/tasks',
    ]
    for (const p of topLevelPaths) {
      expect(
        routerHasPath(router, p),
        `router.tsx should declare path '${p}' for the data-router migration (Task 2.1)`,
      ).toBe(true)
    }
    // Index route (the layout's `<Route index element={<PortfolioRedirect/>} />`).
    expect(routerHasIndex(router)).toBe(true)
    // Catch-all wildcard redirect.
    expect(routerHasPath(router, '*')).toBe(true)
  })

  it('router.tsx route definitions declare no `loader` (out of scope for this track)', () => {
    // Test-strategy §4: "No loader/action work in this track — guard by
    // making App.routes.test.tsx assert routes have no loader/action.
    // Adding them is a follow-up track." This prevents scope creep into
    // the data-loading half of the migration.
    const router = readFileSync(ROUTER_TSX_PATH, 'utf8')
    expect(router).not.toMatch(/\bloader\s*:/)
  })

  it('router.tsx route definitions declare no `action` (out of scope for this track)', () => {
    const router = readFileSync(ROUTER_TSX_PATH, 'utf8')
    expect(router).not.toMatch(/\baction\s*:/)
  })
})

describe('AppRoutes — Phase 2.2: nested data-router routes with params', () => {
  it('router.tsx contains every nested parameterized path from the inventory', () => {
    const router = readFileSync(ROUTER_TSX_PATH, 'utf8')
    // Parameterized / nested paths. These MUST be children of the layout
    // route, not separate top-level entries.
    //
    // Maintained against router.tsx, not against an archived inventory.md.
    // 'ops/optimize' and 'ops/simulate' went with the A/B testing and policy
    // simulation subsystems in the Phase 3 scalpel.
    // NOTE: the settings sub-routes are intentionally NOT grepped here.
    // They are RELATIVE children ('app', 'agents', …) of the parent
    // `settings` route, so a source grep cannot prove they are settings
    // children. The dedicated test below + the runtime
    // contract in data-router-settings.test.tsx own the settings nesting.
    const nestedPaths = [
      'agents/:name/edit',
      'agents/leaderboard',
      'agent-templates/:id/edit',
      'project/:id',
      'tasks/:taskId/timeline',
      'ops/monitor',
      'ops/diagnose',
      'ops/reconcile',
    ]
    for (const p of nestedPaths) {
      expect(
        routerHasPath(router, p),
        `router.tsx should declare nested path '${p}' for the data-router migration (Task 2.2)`,
      ).toBe(true)
    }
  })

  it('router.tsx nests the settings sub-routes under a parent `settings` layout with RELATIVE child paths', () => {
    // The data-router keeps the same UX as v6: /settings renders
    // <SettingsLayout> with /settings/* rendered inside its <Outlet/>.
    // The Green shape is a parent route with `path: 'settings'` and
    // children whose paths are RELATIVE ('app', not 'settings/app').
    // Absolute-style child paths resolve to /settings/settings/app — the
    // Phase 2 regression caught by data-router-settings.test.tsx. This
    // assertion inverts the original false-green (which checked for the
    // buggy 'settings/app' literal and so passed on the broken config).
    const router = readFileSync(ROUTER_TSX_PATH, 'utf8')
    expect(routerHasPath(router, 'settings')).toBe(true)
    // Relative child paths present (Green shape).
    expect(routerHasPath(router, 'app')).toBe(true)
    expect(routerHasPath(router, 'profile')).toBe(true)
    // Buggy absolute-style child paths absent (regression guard).
    expect(routerHasPath(router, 'settings/app')).toBe(false)
    expect(routerHasPath(router, 'settings/agents')).toBe(false)
    expect(routerHasPath(router, 'settings/profile')).toBe(false)
  })
})

describe('AppRoutes — Phase 2.3: programmatic navigate uses v7 useNavigate() patterns', () => {
  it('BlockersPage uses useNavigate() for in-app navigation, not window.location.href', () => {
    // The only page in HEAD's frontend/src that uses `window.location.href`
    // for in-app navigation is BlockersPage.tsx (`/board?task=...`). Other
    // `window.location` references are for non-navigation purposes:
    // useWebSocket.ts / useLogStream.ts read `.protocol`/`.host` for WS
    // URLs, and OptimizePage.tsx uses `.reload()` (full-page refresh).
    // The test asserts BlockersPage no longer has that hard navigation.
    const blockers = readFileSync(BLOCKERS_TSX_PATH, 'utf8')
    // The "navigate to /board?task=..." flow is the only in-app
    // `window.location.href =` in the page. The Green shape replaces
    // it with `const navigate = useNavigate()` + `navigate(\`/board?task=...\`)`.
    expect(
      blockers,
      'BlockersPage.tsx should not use window.location.href for in-app navigation — use useNavigate() instead',
    ).not.toMatch(/window\.location\.href\s*=\s*[`'"]\/board/)
    // And the page should pull in useNavigate.
    expect(blockers).toMatch(/useNavigate/)
  })

  it('router.tsx includes the routes targeted by every useNavigate() call site', () => {
    // UseNavigate call sites (live at HEAD):
    //   useCreateSprint         → /project/:id
    //   AgentTemplateEditorPage → /agent-templates
    //   PortfolioPage           → /sprint-planning
    //   AgentEditorPage         → /agents
    //   KanbanBoardPage         → /tasks/:taskId/timeline
    //   AgentTemplatesPage      → /agent-templates/:id/edit
    //   AppLayout               → /settings
    // Plus useAgentForm, which navigates to /agents/:name/edit.
    // For the Red test, we assert the highest-traffic targets exist in
    // the data-router. The wildcard / 404 fallback and the full route
    // tree are covered by 2.1 + 2.2 + Phase 3's behavioral render.
    const router = readFileSync(ROUTER_TSX_PATH, 'utf8')
    const navigateTargets = [
      'project/:id',
      'harnesses',
      'agent-templates',
      'sprint-planning',
      'agents',
      'tasks/:taskId/timeline',
      'agent-templates/:id/edit',
      'settings',
      'agents/:name/edit',
    ]
    for (const p of navigateTargets) {
      expect(
        routerHasPath(router, p),
        `router.tsx should declare path '${p}' — target of a useNavigate() call site (Task 2.3)`,
      ).toBe(true)
    }
  })
})

describe('AppRoutes — Phase 2.4: no React Router 6 future flags in non-test source', () => {
  /**
   * The legacy v6 `future` prop is removed in v7 (the v7 behaviors are
   * on by default). Task 2.4 is to strip every v7_* flag from
   * non-test source files: the production `App.tsx`, `main.tsx`, the
   * router module, and `frontend/vite.config.ts`. The contract is that
   * the literal flag names do not appear outside of `*.test.*` files
   * (which legitimately opt into v6 future behavior to keep the
   * characterization suite green — see the 44 occurrences across
   * `frontend/src/**` from the strategy §6 grep).
   */
  it('no v7_* future-flag strings appear in frontend/src outside of *.test.* files', () => {
    const files = listNonTestSourceFiles(SRC_ROOT)
    expect(
      files.length,
      'expected frontend/src to contain non-test .ts/.tsx files',
    ).toBeGreaterThan(0)
    const offenders: { file: string; flag: string }[] = []
    for (const file of files) {
      const src = readFileSync(file, 'utf8')
      for (const flag of V7_FUTURE_FLAGS) {
        if (src.includes(flag)) {
          offenders.push({ file: file.split(`${REPO_ROOT_FOR_SRC}${sep}`).pop() ?? file, flag })
        }
      }
    }
    expect(
      offenders,
      `Task 2.4 contract: remove every v6 future-flag literal from non-test source. Offenders: ${JSON.stringify(offenders)}`,
    ).toEqual([])
  })

  it('no v7_* future-flag strings appear in frontend/vite.config.ts', () => {
    expect(
      existsSync(VITE_CONFIG_PATH),
      'vite.config.ts should exist at frontend/vite.config.ts',
    ).toBe(true)
    const vite = readFileSync(VITE_CONFIG_PATH, 'utf8')
    for (const flag of V7_FUTURE_FLAGS) {
      expect(
        vite,
        `frontend/vite.config.ts should not declare v6 future flag '${flag}' — v7 is on by default`,
      ).not.toContain(flag)
    }
  })

  it('App.tsx no longer passes a `future` prop to a v6 router (BrowserRouter/etc.)', () => {
    const app = readFileSync(APP_TSX_PATH, 'utf8')
    // The Red signal: `<BrowserRouter future={...}>` (or any `<X future={...}>`)
    // — Green removes BrowserRouter entirely (per the 2.1 contract), so the
    // `future` prop should be gone with it. We assert the literal `future={`
    // does not appear, which is the strongest direct signal.
    expect(
      app,
      'App.tsx should not use a v6 `future={...}` prop — v7 future flags are on by default',
    ).not.toMatch(/future\s*=\s*\{/)
  })
})
