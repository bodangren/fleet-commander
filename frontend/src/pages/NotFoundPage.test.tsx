import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

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

import { NotFoundPage } from './NotFoundPage'
import { routes } from '@/router'

describe('NotFoundPage', () => {
  it('is resolved by the production wildcard data route', async () => {
    const wildcard = routes[0]?.children?.find(route => route.path === '*')

    expect(wildcard?.element).toBeUndefined()
    expect(wildcard?.lazy).toEqual(expect.any(Function))
    await expect(wildcard!.lazy!()).resolves.toMatchObject({ Component: NotFoundPage })
  })

  it('production routes preserve the attempted path and render a recovery link', async () => {
    const router = createMemoryRouter(routes, {
      initialEntries: ['/this-route-does-not-exist'],
    })
    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument()
    expect(screen.getByText('/this-route-does-not-exist')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Portfolio' })).toHaveAttribute(
      'href',
      '/portfolio',
    )
    expect(router.state.location.pathname).toBe('/this-route-does-not-exist')
  })
})
