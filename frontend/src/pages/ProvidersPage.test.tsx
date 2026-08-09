import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

import { ProvidersPage } from './ProvidersPage'
import { ToastProvider } from '@/lib/toast'
import type { ProviderHealthInfo, FallbackEventInfo } from '@/hooks/useProviderHealth'
import type { FleetDataState } from '@/lib/useFleetData'

const mockUseProviderHealth = vi.fn()

vi.mock('@/hooks/useProviderHealth', () => ({
  useProviderHealth: () => mockUseProviderHealth(),
}))

let fleet: FleetDataState

function setFleet(models = ['gpt-4o']) {
  fleet = {
    healthStatus: 'Backend Status: ok',
    projects: [],
    agents: [],
    harnesses: [
      {
        layer: 'bundled',
        binaryFound: true,
        models,
        definition: {
          name: 'openai',
          binary: 'pi',
          discovery: {
            command: 'pi --list-models',
            parseStrategy: 'pi-roster',
            pattern: 'openai/*',
          },
          invocation: { template: 'pi --model {model}', flags: {} },
        },
      },
    ],
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
    agentTestResult: null,
    harnessDiscoveryResult: null,
    testAgent: vi.fn(async () => {}),
    testHarnessDiscovery: vi.fn(async () => {}),
  }
}

function setHealthData(providers: ProviderHealthInfo[], fallbackEvents: FallbackEventInfo[] = []) {
  mockUseProviderHealth.mockReturnValue({
    providers,
    fallbackEvents,
    loading: false,
    refresh: vi.fn(),
  })
}

function renderPage() {
  return render(
    <ToastProvider>
      <ProvidersPage fleet={fleet} />
    </ToastProvider>,
  )
}

describe('ProvidersPage notification toast', () => {
  beforeEach(() => {
    mockUseProviderHealth.mockReset()
    setFleet()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the provider card for each configured provider', async () => {
    setFleet(['gpt-4o', 'gpt-4o-mini'])
    setHealthData([
      {
        _id: 'p1',
        name: 'openai',
        models: ['gpt-4o', 'gpt-4o-mini'],
        status: 'active',
        healthStatus: 'healthy',
        avgLatencyMs: 800,
        failureCount: 0,
        lastCheckedAt: Date.now(),
        lastSuccessAt: Date.now(),
        createdAt: Date.now(),
      },
    ])

    await act(async () => {
      renderPage()
    })

    expect(screen.getByText('2 models available')).toBeInTheDocument()
  })

  it('keeps a ready provider catalog visible while agent assignments are still loading', async () => {
    fleet.agentsLoading = true
    setHealthData([])

    await act(async () => {
      renderPage()
    })

    expect(screen.getByRole('heading', { name: 'LLM Providers' })).toBeInTheDocument()
    expect(screen.getByText('1 model available')).toBeInTheDocument()
    expect(screen.queryByText('Loading providers...')).not.toBeInTheDocument()
    expect(screen.getByText('Agent-Model Assignments')).toBeInTheDocument()
    expect(screen.getByText('Loading agent assignments...')).toBeInTheDocument()
  })

  it('keeps providers visible and retries only agents when assignments fail', async () => {
    const refreshFleet = vi.fn(async () => {})
    const refreshAgents = vi.fn(async () => {})
    const refreshHarnesses = vi.fn(async () => {})
    fleet.refresh = refreshFleet
    fleet.refreshAgents = refreshAgents
    fleet.refreshHarnesses = refreshHarnesses
    fleet.agentsError = 'Agent catalog unavailable'
    setHealthData([])

    await act(async () => {
      renderPage()
    })

    expect(screen.getByRole('heading', { name: 'LLM Providers' })).toBeInTheDocument()
    expect(screen.getByText('1 model available')).toBeInTheDocument()
    expect(screen.getByText('Agent assignments unavailable')).toBeInTheDocument()
    expect(screen.getByText('Agent catalog unavailable')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry agents' }))

    expect(refreshAgents).toHaveBeenCalledOnce()
    expect(refreshFleet).not.toHaveBeenCalled()
    expect(refreshHarnesses).not.toHaveBeenCalled()
  })

  it('shows an error toast when a provider transitions to unhealthy', async () => {
    vi.useFakeTimers()
    try {
      setHealthData([
        {
          _id: 'p1',
          name: 'openai',
          models: ['gpt-4o'],
          status: 'active',
          healthStatus: 'unhealthy',
          avgLatencyMs: 30_000,
          failureCount: 5,
          lastCheckedAt: Date.now(),
          lastSuccessAt: Date.now() - 10 * 60 * 1000,
          createdAt: Date.now(),
        },
      ])

      await act(async () => {
        renderPage()
        await vi.advanceTimersByTimeAsync(100)
      })

      const toasts = document.querySelectorAll('.text-red-200')
      expect(toasts.length).toBeGreaterThan(0)
      const toastText = Array.from(toasts)
        .map(el => el.textContent ?? '')
        .join(' ')
        .toLowerCase()
      expect(toastText).toContain('openai')
      expect(toastText).toContain('unhealthy')
    } finally {
      vi.useRealTimers()
    }
  })

  it('auto-dismisses the failure toast after the configured timeout', async () => {
    vi.useFakeTimers()
    try {
      setHealthData([
        {
          _id: 'p1',
          name: 'openai',
          models: ['gpt-4o'],
          status: 'active',
          healthStatus: 'unhealthy',
          avgLatencyMs: 30_000,
          failureCount: 5,
          lastCheckedAt: Date.now(),
          lastSuccessAt: Date.now() - 10 * 60 * 1000,
          createdAt: Date.now(),
        },
      ])

      await act(async () => {
        renderPage()
        await vi.advanceTimersByTimeAsync(100)
      })

      expect(document.querySelectorAll('.text-red-200').length).toBeGreaterThan(0)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000)
      })

      expect(document.querySelectorAll('.text-red-200').length).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not show a failure toast when every provider is healthy', async () => {
    vi.useFakeTimers()
    try {
      setHealthData([
        {
          _id: 'p1',
          name: 'openai',
          models: ['gpt-4o'],
          status: 'active',
          healthStatus: 'healthy',
          avgLatencyMs: 800,
          failureCount: 0,
          lastCheckedAt: Date.now(),
          lastSuccessAt: Date.now(),
          createdAt: Date.now(),
        },
      ])

      await act(async () => {
        renderPage()
        await vi.advanceTimersByTimeAsync(100)
      })

      expect(document.querySelectorAll('.text-red-200').length).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not show a failure toast for degraded providers (only unhealthy)', async () => {
    vi.useFakeTimers()
    try {
      setHealthData([
        {
          _id: 'p1',
          name: 'openai',
          models: ['gpt-4o'],
          status: 'active',
          healthStatus: 'degraded',
          avgLatencyMs: 12_000,
          failureCount: 1,
          lastCheckedAt: Date.now(),
          lastSuccessAt: Date.now(),
          createdAt: Date.now(),
        },
      ])

      await act(async () => {
        renderPage()
        await vi.advanceTimersByTimeAsync(100)
      })

      expect(document.querySelectorAll('.text-red-200').length).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
})
