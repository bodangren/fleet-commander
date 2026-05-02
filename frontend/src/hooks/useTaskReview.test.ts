import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTaskReview } from './useTaskReview'

describe('useTaskReview', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('initializes with default values', () => {
    const { result } = renderHook(() => useTaskReview('proj-1'))

    expect(result.current.review).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('does nothing when projectId is undefined', async () => {
    const { result } = renderHook(() => useTaskReview(undefined))

    await act(async () => {
      await result.current.fetchReview('task-1')
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.review).toBeNull()
  })

  it('fetches review data successfully', async () => {
    const mockReview = {
      taskId: 'task-1',
      status: 'passed',
      summary: 'All checks passed',
      findings: [],
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => mockReview })),
    )

    const { result } = renderHook(() => useTaskReview('proj-1'))

    await act(async () => {
      await result.current.fetchReview('task-1')
    })

    expect(result.current.review).toEqual(mockReview)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets error on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Review not found' }),
        }),
      ),
    )

    const { result } = renderHook(() => useTaskReview('proj-1'))

    await act(async () => {
      await result.current.fetchReview('task-1')
    })

    expect(result.current.error).toBe('Review not found')
    expect(result.current.review).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('sets generic error on network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Network error'))),
    )

    const { result } = renderHook(() => useTaskReview('proj-1'))

    await act(async () => {
      await result.current.fetchReview('task-1')
    })

    expect(result.current.error).toBe('Network error')
  })

  it('clearReview resets state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ taskId: 't1', status: 'passed' }),
        }),
      ),
    )

    const { result } = renderHook(() => useTaskReview('proj-1'))

    await act(async () => {
      await result.current.fetchReview('task-1')
    })

    expect(result.current.review).not.toBeNull()

    act(() => {
      result.current.clearReview()
    })

    expect(result.current.review).toBeNull()
    expect(result.current.error).toBeNull()
  })
})
