/**
 * Phase 7 Red-phase tests for the `useProviderHealth` hook (TD-235).
 *
 * The Green phase must add `healthStatus` to the `ProviderHealthInfo`
 * interface in this hook so the dashboard can distinguish the operational
 * `status` field from the health-monitoring `healthStatus` field.
 *
 * Currently the hook's return type does not declare `healthStatus`, so
 * these tests fail at the TypeScript level (compile error on the
 * `result.current.providers[0].healthStatus` access) and at the runtime
 * level when the hook strips unknown fields (it does not, so the runtime
 * check passes by coincidence — the test acts as a contract guard to
 * prevent the field from being dropped).
 *
 * Spec: measure/tracks/provider_health_resilience_20260605/spec.md
 * Test strategy: measure/tracks/provider_health_resilience_20260605/test-strategy.md
 * Plan: Phase 7 task 1
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProviderHealth, type ProviderHealthInfo } from './useProviderHealth'

describe('useProviderHealth (TD-235)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns providers with the healthStatus field populated (TD-235)', async () => {
    const mockProviders: ProviderHealthInfo[] = [
      {
        _id: 'p1',
        name: 'openai',
        models: ['gpt-4o'],
        status: 'active',
        avgLatencyMs: 800,
        failureCount: 0,
        lastCheckedAt: 1_000,
        lastSuccessAt: 1_000,
        createdAt: 1_000,
      },
    ]
    const mockFallbacks: Array<Record<string, unknown>> = []

    const mockFetch = vi.fn((input: string) => {
      if (input === '/api/providers/health') {
        return Promise.resolve({ ok: true, json: async () => mockProviders })
      }
      if (input === '/api/providers/fallbacks') {
        return Promise.resolve({ ok: true, json: async () => mockFallbacks })
      }
      return Promise.resolve({ ok: true, json: async () => [] })
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useProviderHealth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.providers).toEqual(mockProviders)
    // Contract: every returned provider must carry a `healthStatus` field
    // (even if undefined) so the dashboard can prefer it over `status`.
    for (const provider of result.current.providers) {
      expect(provider).toHaveProperty('healthStatus')
    }
  })

  it('preserves the healthStatus value returned by the API (TD-235)', async () => {
    const mockProviders = [
      {
        _id: 'p1',
        name: 'openai',
        models: ['gpt-4o'],
        status: 'active',
        healthStatus: 'unhealthy',
        avgLatencyMs: 30_000,
        failureCount: 5,
        lastCheckedAt: 1_000,
        lastSuccessAt: 1_000,
        createdAt: 1_000,
      },
    ]
    const mockFetch = vi.fn((input: string) => {
      if (input === '/api/providers/health') {
        return Promise.resolve({ ok: true, json: async () => mockProviders })
      }
      if (input === '/api/providers/fallbacks') {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      return Promise.resolve({ ok: true, json: async () => [] })
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useProviderHealth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const first = result.current.providers[0] as ProviderHealthInfo & {
      healthStatus?: string
    }
    expect(first.healthStatus).toBe('unhealthy')
  })
})
