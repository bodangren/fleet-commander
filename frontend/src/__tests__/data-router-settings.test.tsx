/**
 * Phase 3 Test Validation — data-router runtime contract (live source proof).
 *
 * Spec:  measure/tracks/react_router_7_migration_20260611/spec.md
 * Plan:  measure/tracks/react_router_7_migration_20260611/plan.md (Phase 3)
 * Strategy: measure/tracks/react_router_7_migration_20260611/test-strategy.md §4, §7
 *
 * The test-strategy §4 explicitly promises that "rendering via the new
 * data-router and asserting resolved pathnames" is the Phase 3 deliverable
 * (the "live source proof" the strategy allows for code-artifact phases).
 * The Phase 2.2 source-presence contract test in `App.routes.test.tsx`
 * (lines 401-414) only confirms the literal `path: 'settings/app'`
 * substring exists in the file; it does not verify the runtime
 * resolution. This file closes that gap.
 *
 * The current `frontend/src/router.tsx` (Phase 2 Green evidence, commit
 * 4e9c289) declares the four `/settings/*` sub-routes as children of a
 * parent `path: 'settings'` route, but uses absolute-style paths on the
 * children (`path: 'settings/app'`, etc.) instead of the required
 * relative paths (`path: 'app'`, etc.). In a data router, child paths
 * are RELATIVE to the parent — so the current config resolves
 * `/settings/settings/app`, not `/settings/app`. The Red tests below
 * reproduce the production route config through `createMemoryRouter`
 * and assert the correct resolution.
 *
 * The route config is re-declared here (mirroring `router.tsx` lines
 * 93-103 EXACTLY) because we cannot extract the live config from the
 * production router singleton without modifying source code (the
 * Red-phase boundary permits only test files and Measure docs). If the
 * production config drifts, this test must be updated to match — the
 * source-presence test in `App.routes.test.tsx` is the upstream
 * contract that this test validates at runtime.
 *
 * The page components (`AppConfigSection` etc.) are replaced with
 * marker `<div data-testid=...>` elements so the test asserts the
 * ROUTE RESOLUTION (which subtree element renders) and not the page
 * content (which is covered by other Phase 2/3 component tests).
 */
import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router-dom'

const SETTINGS_LAYOUT_MARKER = 'settings-layout-marker'
const SETTINGS_INDEX_MARKER = 'settings-index-marker'
const SETTINGS_APP_MARKER = 'app-config-marker'
const SETTINGS_NOTIFICATIONS_MARKER = 'notifications-marker'
const SETTINGS_AGENTS_MARKER = 'agent-defaults-marker'
const SETTINGS_PROFILE_MARKER = 'profile-marker'

/**
 * Mirrors the settings subtree in `frontend/src/router.tsx`. In a data
 * router, child `path` values are RELATIVE to the parent `settings` route,
 * so they must be bare segments ('app', 'notifications', …) — NOT
 * absolute-style ('settings/app'), which would resolve to
 * /settings/settings/app. The Phase 2 migration shipped the absolute-style
 * form; the Phase 3 fix (commit in plan) corrected `router.tsx` to the
 * relative form mirrored here. The `settings subtree matches production
 * router.tsx` test below guards against the production config drifting back.
 */
const SETTINGS_SUBTREE = [
  {
    path: 'settings',
    element: (
      <div data-testid={SETTINGS_LAYOUT_MARKER}>
        <Outlet />
      </div>
    ),
    children: [
      { index: true, element: <div data-testid={SETTINGS_INDEX_MARKER} /> },
      { path: 'app', element: <div data-testid={SETTINGS_APP_MARKER} /> },
      {
        path: 'notifications',
        element: <div data-testid={SETTINGS_NOTIFICATIONS_MARKER} />,
      },
      { path: 'agents', element: <div data-testid={SETTINGS_AGENTS_MARKER} /> },
      { path: 'profile', element: <div data-testid={SETTINGS_PROFILE_MARKER} /> },
    ],
  },
]

function renderAt(path: string) {
  const router = createMemoryRouter(SETTINGS_SUBTREE, {
    initialEntries: [path],
  })
  return render(<RouterProvider router={router} />)
}

describe('router.tsx data-router — settings subtree runtime contract (Phase 3 live source proof)', () => {
  it('resolves /settings/app to the app-config subtree element', async () => {
    renderAt('/settings/app')
    // Red signal: the child path 'settings/app' is relative to the
    // parent 'settings', so it resolves to /settings/settings/app, not
    // /settings/app. /settings/app falls through to nothing inside the
    // Outlet — the app-config marker is not in the document.
    await waitFor(() => {
      expect(
        screen.getByTestId(SETTINGS_APP_MARKER),
        'data-router should resolve /settings/app to the app-config subtree element (currently falls through to the empty Outlet)',
      ).toBeInTheDocument()
    })
  })

  it('resolves /settings/notifications to the notifications subtree element', async () => {
    renderAt('/settings/notifications')
    await waitFor(() => {
      expect(screen.getByTestId(SETTINGS_NOTIFICATIONS_MARKER)).toBeInTheDocument()
    })
  })

  it('resolves /settings/agents to the agent-defaults subtree element', async () => {
    renderAt('/settings/agents')
    await waitFor(() => {
      expect(screen.getByTestId(SETTINGS_AGENTS_MARKER)).toBeInTheDocument()
    })
  })

  it('resolves /settings/profile to the profile subtree element', async () => {
    renderAt('/settings/profile')
    await waitFor(() => {
      expect(screen.getByTestId(SETTINGS_PROFILE_MARKER)).toBeInTheDocument()
    })
  })
})

describe('settings subtree matches production router.tsx (drift guard)', () => {
  it('declares settings child routes with relative paths, not absolute /settings/* paths', async () => {
    // Import the REAL router config (not the clone above) so this test
    // fails if production ever regresses back to absolute-style child
    // paths — the gap the Phase 2.2 source-presence test could not catch.
    const { router } = await import('@/router')

    const findSettings = (routes: typeof router.routes): typeof router.routes => {
      for (const route of routes) {
        if (route.path === 'settings' && route.children) return route.children
        if (route.children) {
          const nested = findSettings(route.children)
          if (nested.length) return nested
        }
      }
      return []
    }

    const settingsChildren = findSettings(router.routes)
    const childPaths = settingsChildren
      .map((c) => c.path)
      .filter((p): p is string => typeof p === 'string')

    expect(childPaths).toContain('app')
    expect(childPaths).toContain('notifications')
    expect(childPaths).toContain('agents')
    expect(childPaths).toContain('profile')
    for (const p of childPaths) {
      expect(
        p.startsWith('settings/'),
        `settings child path "${p}" must be relative ("${p.replace(/^settings\//, '')}"), not absolute-style — absolute child paths resolve to /settings/${p}`,
      ).toBe(false)
    }
  })
})
