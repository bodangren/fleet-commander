import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import { AgentsPage } from './AgentsPage'
import type { FleetDataState } from '@/lib/useFleetData'

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise
  })

  return { promise, resolve }
}

const fleet = {
  healthStatus: 'Backend Status: ok',
  projects: [],
  agents: [
    {
      layer: 'user',
      definition: {
        name: 'Senior Backend',
        description: 'Builds backend services',
        mode: 'agent',
        model: 'codex-cli/codex-1',
        temperature: 0.2,
        tools: {
          write: true,
          edit: true,
          bash: true,
        },
        body: 'Backend prompt.',
      },
    },
  ],
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
  refresh: vi.fn(async () => {}),
  refreshProjects: vi.fn(async () => {}),
  refreshAgents: vi.fn(async () => {}),
  refreshHarnesses: vi.fn(async () => {}),
  refreshHealth: vi.fn(async () => {}),
  busyAgent: null,
  busyHarness: null,
  agentTestResult: {
    name: 'Senior Backend',
    status: 'ready',
    latencyMs: 123,
    output: 'OK',
  },
  harnessDiscoveryResult: null,
  testAgent: vi.fn(async () => {}),
  testHarnessDiscovery: vi.fn(async () => {}),
} satisfies FleetDataState

function renderAgents(fleetData: FleetDataState = fleet) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AgentsPage fleet={fleetData} />
    </MemoryRouter>,
  )
}

describe('AgentsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the agent list, workload, and latest readiness result', async () => {
    const workloadResponse = deferred<Response>()
    const fetchMock = vi.fn(() => workloadResponse.promise)
    vi.stubGlobal('fetch', fetchMock)

    renderAgents()

    expect(screen.getByText('Builds backend services')).toBeInTheDocument()
    expect(screen.getByText('@Senior Backend')).toBeInTheDocument()
    expect(screen.getByText('Agent Readiness: Senior Backend')).toBeInTheDocument()
    expect(screen.getByText('123 ms')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add Agent' })).toHaveAttribute(
      'href',
      '/agents/new/edit',
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/agents/workload')
    })
    await act(async () => {
      workloadResponse.resolve(
        jsonResponse([
          {
            name: 'Senior Backend',
            displayName: 'Senior Backend',
            mode: 'agent',
            model: 'codex-cli/codex-1',
            currentTask: {
              taskKey: 'TD-268',
              title: 'Repair warning contracts',
              projectSlug: 'fleet-commander',
            },
            successRate7d: 0.98,
            medianLatencyMs: 456,
            queueDepth: 1,
            circuitState: 'closed',
          },
        ]),
      )
    })

    expect(screen.getByText('Repair warning contracts')).toBeInTheDocument()
    expect(screen.getByText('98%')).toBeInTheDocument()
    expect(screen.getByText('456ms')).toBeInTheDocument()
  })

  it('keeps the roster loading state visible while workload data is pending', async () => {
    const workloadResponse = deferred<Response>()
    const fetchMock = vi.fn(() => workloadResponse.promise)
    vi.stubGlobal('fetch', fetchMock)

    renderAgents({ ...fleet, agentsLoading: true, agentTestResult: null })

    expect(screen.getByText('Loading agent registry...')).toBeInTheDocument()
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/agents/workload')
    })
  })

  it('shows the roster error and awaits the retry interaction', async () => {
    const user = userEvent.setup()
    const workloadResponse = deferred<Response>()
    const fetchMock = vi.fn(() => workloadResponse.promise)
    const refreshAgents = vi.fn(async () => {})
    vi.stubGlobal('fetch', fetchMock)

    renderAgents({
      ...fleet,
      agents: [],
      agentsError: 'Registry unavailable',
      agentTestResult: null,
      refreshAgents,
    })

    expect(
      screen.getByText('Unable to load agent registry: Registry unavailable'),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/agents/workload')
    })
    await user.click(screen.getByRole('button', { name: 'Retry agents' }))
    expect(refreshAgents).toHaveBeenCalledOnce()

    await act(async () => {
      workloadResponse.resolve(jsonResponse([]))
    })
  })

  it('shows the empty registry after the workload request settles', async () => {
    const workloadResponse = deferred<Response>()
    const fetchMock = vi.fn(() => workloadResponse.promise)
    vi.stubGlobal('fetch', fetchMock)

    renderAgents({ ...fleet, agents: [], agentTestResult: null })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/agents/workload')
    })
    await act(async () => {
      workloadResponse.resolve(jsonResponse([]))
    })

    expect(screen.getByText('The agent registry is empty.')).toBeInTheDocument()
  })

  it('renders contradictory readiness data as a visible failure', async () => {
    const workloadResponse = deferred<Response>()
    const fetchMock = vi.fn(() => workloadResponse.promise)
    vi.stubGlobal('fetch', fetchMock)

    renderAgents({
      ...fleet,
      agentTestResult: {
        name: 'Senior Backend',
        status: 'ready',
        latencyMs: 123,
        output: 'Readiness output is hidden when an error is present.',
        error: 'Provider credentials unavailable',
      },
    })

    expect(screen.getByText('Provider credentials unavailable')).toBeInTheDocument()
    expect(screen.getByText('failed')).toBeInTheDocument()
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/agents/workload')
    })
    await act(async () => {
      workloadResponse.resolve(jsonResponse([]))
    })
  })
})
