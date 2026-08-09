import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { routes } from './router'

const analyticsRoutePath = 'analytics'

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
    document.body.innerHTML = ''
  })

  it('defers Analytics to a data-router lazy route and resolves its real route module on demand', async () => {
    const analyticsRoute = findRouteByPath(routes, analyticsRoutePath)

    // React Router data routes load `lazy` only after this route matches. An
    // `element` here would retain an eager page import in the entry chunk.
    expect(analyticsRoute.element).toBeUndefined()
    expect(analyticsRoute.lazy).toEqual(expect.any(Function))

    const lazyRouteModule = await analyticsRoute.lazy!()
    expect(lazyRouteModule.Component).toEqual(expect.any(Function))
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

    const router = createMemoryRouter(routeTree, {
      initialEntries: ['/analytics'],
    })
    render(<RouterProvider router={router} />)

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Unable to load this page'),
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Analytics route chunk could not be loaded')
  })
})
