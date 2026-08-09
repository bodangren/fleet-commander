import { render, screen, waitFor } from '@testing-library/react'
import type { ComponentType } from 'react'
import { lazy, Suspense } from 'react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { routes } from './router'

const analyticsRoutePath = 'analytics'

const representativeLazyRoutes = [
  ['core dashboard', 'dashboard'],
  ['project workspace', 'project/:id'],
  ['analytics', 'analytics'],
  ['settings layout', 'settings'],
  ['settings quality section', 'quality'],
  ['operations console', 'ops'],
  ['operations quality', 'ops/quality'],
  ['task history', 'history/tasks'],
  ['agent history', 'history/agents'],
  ['fleet agents wrapper', 'agents'],
  ['fleet providers wrapper', 'providers'],
  ['fleet harnesses wrapper', 'harnesses'],
] as const

const testRouters: Array<ReturnType<typeof createMemoryRouter>> = []

/**
 * Creates an isolated data router and records it for deterministic disposal.
 */
function createTestRouter(routeTree: RouteObject[], initialPath: string) {
  const router = createMemoryRouter(routeTree, { initialEntries: [initialPath] })
  testRouters.push(router)
  return router
}

/**
 * Finds one route by its relative path from a nested data-router route tree.
 */
function findRouteByPath(routeTree: RouteObject[], path: string): RouteObject {
  const findNestedRoute = (routesToSearch: RouteObject[]): RouteObject | undefined => {
    for (const route of routesToSearch) {
      if (route.path === path) return route
      const nestedRoute = route.children ? findNestedRoute(route.children) : undefined
      if (nestedRoute) return nestedRoute
    }
    return undefined
  }

  const route = findNestedRoute(routeTree)
  if (route) return route

  throw new Error(`Route "${path}" was not found`)
}

/**
 * Creates a mutable route tree so a single lazy import can be made to reject
 * without changing the production router singleton used by other tests.
 */
function cloneRouteTree(routeTree: RouteObject[]): RouteObject[] {
  return routeTree.map(route => ({
    ...route,
    children: route.children ? cloneRouteTree(route.children) : undefined,
  }))
}

describe('TD-269 route-level lazy loading', () => {
  afterEach(() => {
    for (const router of testRouters) router.dispose()
    testRouters.length = 0
  })

  it.each(representativeLazyRoutes)(
    'defers the %s route to a data-router lazy resolver',
    async (_, path) => {
      const route = findRouteByPath(routes, path)

      // React Router data routes load `lazy` only after this route matches.
      // An `element` here would retain an eager page import in the entry chunk.
      expect(route.element).toBeUndefined()
      expect(route.lazy).toEqual(expect.any(Function))

      const lazyRouteModule = await route.lazy!()
      expect(lazyRouteModule.Component).toEqual(expect.any(Function))
    },
  )

  it('renders the production initial fallback until a matched lazy route module resolves', async () => {
    let resolveRouteModule!: (routeModule: { Component: ComponentType }) => void
    const routeModule = new Promise<{ Component: ComponentType }>(resolve => {
      resolveRouteModule = resolve
    })
    const routeTree = cloneRouteTree(routes)
    const analyticsRoute = findRouteByPath(routeTree, analyticsRoutePath)
    analyticsRoute.lazy = () => routeModule
    delete analyticsRoute.element

    const router = createTestRouter(routeTree, '/analytics')
    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('status')).toHaveTextContent('Loading page...')

    resolveRouteModule({
      Component: () => <h1>Analytics route module loaded</h1>,
    })
    expect(
      await screen.findByRole('heading', { name: 'Analytics route module loaded' }),
    ).toBeInTheDocument()
  })

  it('surfaces an Analytics chunk-load rejection through the production route error boundary', async () => {
    const routeTree = cloneRouteTree(routes)
    const analyticsRoute = findRouteByPath(routeTree, analyticsRoutePath)

    // Retain the production route hierarchy and replace only the route-module
    // import. This exercises React Router's actual data-router error handling,
    // rather than a mocked RouterProvider or a source-text assertion.
    expect(analyticsRoute.lazy).toEqual(expect.any(Function))
    analyticsRoute.lazy = async () => {
      throw new Error('Analytics route chunk could not be loaded')
    }
    delete analyticsRoute.element

    const router = createTestRouter(routeTree, '/analytics')
    render(<RouterProvider router={router} />)

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Unable to load this page'),
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Analytics route chunk could not be loaded')
  })

  it('bubbles a rejected React.lazy child through Suspense to the production route error boundary', async () => {
    const routeTree = cloneRouteTree(routes)
    const analyticsRoute = findRouteByPath(routeTree, analyticsRoutePath)
    const lazyChildError = new Error('Analytics nested chunk could not be loaded')
    const RejectedLazyChild = lazy(() => Promise.reject(lazyChildError))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    analyticsRoute.lazy = async () => ({
      Component: function RejectedLazyRoute() {
        return (
          <Suspense fallback={<p>Loading nested Analytics content...</p>}>
            <RejectedLazyChild />
          </Suspense>
        )
      },
    })
    delete analyticsRoute.element

    try {
      const router = createTestRouter(routeTree, '/analytics')
      render(<RouterProvider router={router} />)

      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent('Unable to load this page'),
      )
      expect(screen.getByRole('alert')).toHaveTextContent(lazyChildError.message)
      expect(consoleError.mock.calls.flat().join(' ')).toContain(lazyChildError.message)
    } finally {
      consoleError.mockRestore()
    }
  })
})
