import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useGitStatus } from './useGitStatus'

describe('useGitStatus', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null when no project slug', async () => {
    const { result } = renderHook(() => useGitStatus(null))

    expect(result.current.gitStatus).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('fetches git status for project', async () => {
    const mockStatus = {
      branch: 'main',
      dirty: false,
      ahead: 0,
      behind: 0,
    }

    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockStatus,
      }),
    )
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useGitStatus('test-project'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.gitStatus).toEqual(mockStatus)
    expect(mockFetch).toHaveBeenCalledWith('/api/git/status?project=test-project')
  })

  it('handles errors gracefully', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({ ok: false, json: async () => ({ error: 'Git not initialized' }) }),
    )
    vi.stubGlobal('fetch', mockFetch)

    const { result } = renderHook(() => useGitStatus('test-project'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Git not initialized')
  })
})
