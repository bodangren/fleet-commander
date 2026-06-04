import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePolledJson } from './usePolledJson'

describe('usePolledJson', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('fetches data on mount', async () => {
    const mockData = { status: 'ok' }
    const mockFetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => mockData }))
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => usePolledJson<typeof mockData>('/api/test', 5000))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(mockFetch).toHaveBeenCalledWith('/api/test')
  })

  it('sets error on fetch failure', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 500, json: async () => ({}) }),
    )
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => usePolledJson('/api/test', 5000))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.error).toBe('Failed to fetch /api/test: 500')
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('sets error on network failure', async () => {
    const mockFetch = vi.fn(() => Promise.reject(new Error('Network down')))
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => usePolledJson('/api/test', 5000))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.error).toBe('Network down')
    expect(result.current.loading).toBe(false)
  })

  it('polls at the specified interval', async () => {
    let count = 0
    const mockFetch = vi.fn(() => {
      count++
      return Promise.resolve({ ok: true, json: async () => ({ count }) })
    })
    vi.stubGlobal('fetch', mockFetch)

    renderHook(() => usePolledJson('/api/test', 1000))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(mockFetch).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('does not fetch when url is null', () => {
    const mockFetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) }))
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => usePolledJson(null, 5000))

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('refresh manually triggers a fetch', async () => {
    const mockFetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ count: 1 }) }))
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => usePolledJson<{ count: number }>('/api/test', 60000))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.refresh()
    })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
