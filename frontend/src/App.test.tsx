import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { AppRoutes } from '@/App'

function mockJsonResponse(payload: unknown, ok = true) {
  return {
    ok,
    json: async () => payload,
  } as Response
}

describe('AppRoutes', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the agents route', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.endsWith('/api/health')) {
        return Promise.resolve(mockJsonResponse({ status: 'ok', message: 'ok' }))
      }
      if (url.endsWith('/api/projects')) {
        return Promise.resolve(mockJsonResponse([]))
      }
      if (url.endsWith('/api/agents')) {
        return Promise.resolve(mockJsonResponse([]))
      }
      if (url.endsWith('/api/harnesses')) {
        return Promise.resolve(mockJsonResponse([]))
      }
      return Promise.resolve(mockJsonResponse({ error: 'not found' }, false))
    })

    vi.stubGlobal('fetch', fetchMock)

    render(
      <MemoryRouter
        initialEntries={['/agents']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { level: 2, name: 'Agents' })).toBeInTheDocument()
    expect(
      await screen.findByText('The agent registry is empty or failed to load.'),
    ).toBeInTheDocument()
  })
})
