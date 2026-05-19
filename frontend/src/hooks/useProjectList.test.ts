import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useProjectList } from './useProjectList'

describe('useProjectList', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches projects on mount', async () => {
    const mockProjects = [
      { id: 'p1', name: 'Project 1', description: 'Desc 1', createdAt: 1000, updatedAt: 1000 },
      { id: 'p2', name: 'Project 2', description: 'Desc 2', createdAt: 2000, updatedAt: 2000 },
    ]

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => mockProjects,
        }),
      ),
    )

    const { result } = renderHook(() => useProjectList())

    const { waitFor } = await import('@testing-library/react')
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.projects).toEqual(mockProjects)
    expect(result.current.error).toBeNull()
  })

  it('sets error on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 500 })),
    )

    const { result } = renderHook(() => useProjectList())

    const { waitFor } = await import('@testing-library/react')
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toContain('Failed to fetch projects')
    expect(result.current.projects).toEqual([])
  })

  it('handles network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Network error'))),
    )

    const { result } = renderHook(() => useProjectList())

    const { waitFor } = await import('@testing-library/react')
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Network error')
  })
})
