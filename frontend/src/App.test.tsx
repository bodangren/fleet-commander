import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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

import { AppRoutes } from '@/App'

describe('AppRoutes', () => {
  it('renders the agents route', async () => {
    render(
      <MemoryRouter
        initialEntries={['/agents']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Agents' })).toBeInTheDocument()
    expect(
      await screen.findByText('The agent registry is empty or failed to load.'),
    ).toBeInTheDocument()
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
