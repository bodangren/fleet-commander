import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useProvidersData } from './useProvidersData'

describe('useProvidersData', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads providers and agents on mount', async () => {
    const mockAgents = [{ name: 'architect', displayName: 'Architect', model: 'claude-sonnet' }]
    const mockProviders = [{ name: 'openai', models: ['gpt-4o', 'gpt-4o-mini'] }]

    const mockFetch = vi.fn((input: string) => {
      if (input === '/api/agents') {
        return Promise.resolve({ ok: true, json: async () => mockAgents })
      }
      if (input === '/api/harnesses') {
        return Promise.resolve({ ok: true, json: async () => mockProviders })
      }
      return Promise.resolve({ ok: true, json: async () => [] })
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useProvidersData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.agents).toEqual(mockAgents)
    expect(result.current.providers).toEqual(mockProviders)
    expect(result.current.error).toBeNull()
  })

  it('sets error when agents fetch fails', async () => {
    const mockFetch = vi.fn((input: string) => {
      if (input === '/api/agents') {
        return Promise.resolve({ ok: false, json: async () => ({}) })
      }
      return Promise.resolve({ ok: true, json: async () => [] })
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useProvidersData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load agents')
  })

  it('sets error on network failure', async () => {
    const mockFetch = vi.fn(() => Promise.reject(new Error('Network error')))
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useProvidersData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Network error')
  })

  it('handles non-array agents response gracefully', async () => {
    const mockFetch = vi.fn((input: string) => {
      if (input === '/api/agents') {
        return Promise.resolve({ ok: true, json: async () => ({ not: 'array' }) })
      }
      if (input === '/api/harnesses') {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      return Promise.resolve({ ok: true, json: async () => [] })
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useProvidersData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.agents).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('sets empty providers when harnesses fetch not ok', async () => {
    const mockFetch = vi.fn((input: string) => {
      if (input === '/api/agents') {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (input === '/api/harnesses') {
        return Promise.resolve({ ok: false, json: async () => ({}) })
      }
      return Promise.resolve({ ok: true, json: async () => [] })
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useProvidersData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.providers).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('refresh re-fetches data', async () => {
    let callCount = 0
    const mockFetch = vi.fn((input: string) => {
      if (input === '/api/agents') {
        callCount++
        const data =
          callCount === 1
            ? [{ name: 'a1', displayName: 'A1', model: 'm1' }]
            : [{ name: 'a2', displayName: 'A2', model: 'm2' }]
        return Promise.resolve({ ok: true, json: async () => data })
      }
      if (input === '/api/harnesses') {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      return Promise.resolve({ ok: true, json: async () => [] })
    })
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useProvidersData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.agents).toEqual([{ name: 'a1', displayName: 'A1', model: 'm1' }])

    await act(async () => {
      await result.current.refresh()
    })

    await waitFor(() => {
      expect(result.current.agents).toEqual([{ name: 'a2', displayName: 'A2', model: 'm2' }])
    })
  })
})
