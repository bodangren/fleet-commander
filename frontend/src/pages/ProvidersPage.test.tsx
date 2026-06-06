import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'

import { ProvidersPage } from './ProvidersPage'
import { ToastProvider } from '@/lib/toast'
import type { ProviderInfo, AgentInfo } from '@/hooks/useProvidersData'
import type { ProviderHealthInfo, FallbackEventInfo } from '@/hooks/useProviderHealth'

const mockUseProvidersData = vi.fn()
const mockUseProviderHealth = vi.fn()

vi.mock('@/hooks/useProvidersData', () => ({
  useProvidersData: () => mockUseProvidersData(),
}))

vi.mock('@/hooks/useProviderHealth', () => ({
  useProviderHealth: () => mockUseProviderHealth(),
}))

function setProvidersData(overrides: {
  providers?: ProviderInfo[]
  agents?: AgentInfo[]
  loading?: boolean
  error?: string | null
}) {
  mockUseProvidersData.mockReturnValue({
    providers: overrides.providers ?? [],
    agents: overrides.agents ?? [],
    loading: overrides.loading ?? false,
    error: overrides.error ?? null,
    refresh: vi.fn(),
  })
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
      <ProvidersPage />
    </ToastProvider>,
  )
}

describe('ProvidersPage notification toast', () => {
  beforeEach(() => {
    mockUseProvidersData.mockReset()
    mockUseProviderHealth.mockReset()
    setProvidersData({ providers: [{ name: 'openai', models: ['gpt-4o'] }] })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the provider card for each configured provider', async () => {
    setProvidersData({ providers: [{ name: 'openai', models: ['gpt-4o', 'gpt-4o-mini'] }] })
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
