import { describe, expect, it, vi, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { useStoryGeneration } from '@/hooks/useStoryGeneration'

const story = {
  title: 'Sign up',
  asA: 'new user',
  iWant: 'to register',
  soThat: 'I can use the app',
  acceptanceCriteria: ['Email required'],
  estimate: 'M' as const,
  priority: 'Must' as const,
}

describe('useStoryGeneration', () => {
  const originalFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('starts closed and empty', () => {
    const { result } = renderHook(() => useStoryGeneration('p1', 'tr1'))
    expect(result.current.showModal).toBe(false)
    expect(result.current.stories).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('openModal clears prior preview and error', () => {
    const { result } = renderHook(() => useStoryGeneration('p1', 'tr1'))
    act(() => result.current.openModal())
    expect(result.current.showModal).toBe(true)
  })

  it('handleGenerate POSTs to /generate and stores preview', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ projectSlug: 'demo', trackId: 'tr1', stories: [story] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ) as unknown as typeof fetch

    const { result } = renderHook(() => useStoryGeneration('p1', 'tr1'))
    await act(async () => {
      await result.current.handleGenerate('build it')
    })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/projects/p1/tracks/tr1/generate',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(result.current.stories).toHaveLength(1)
    expect(result.current.stories![0].title).toBe('Sign up')
  })

  it('captures generate errors', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Harness down' }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      }),
    ) as unknown as typeof fetch

    const { result } = renderHook(() => useStoryGeneration('p1', 'tr1'))
    await act(async () => {
      await result.current.handleGenerate('')
    })
    expect(result.current.error).toBe('Harness down')
    expect(result.current.stories).toBeNull()
  })

  it('handleCommit POSTs to /generate/commit and closes on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ projectSlug: 'demo', trackId: 'tr1', stories: 1, tasks: 1 }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    ) as unknown as typeof fetch

    const { result } = renderHook(() => useStoryGeneration('p1', 'tr1'))
    act(() => result.current.openModal())
    await act(async () => {
      await result.current.handleCommit([story])
    })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/projects/p1/tracks/tr1/generate/commit',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ stories: [story] }),
      }),
    )
    expect(result.current.showModal).toBe(false)
  })

  it('captures commit errors and keeps modal open', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Version conflict' }), {
        status: 409,
        headers: { 'content-type': 'application/json' },
      }),
    ) as unknown as typeof fetch

    const { result } = renderHook(() => useStoryGeneration('p1', 'tr1'))
    act(() => result.current.openModal())
    await act(async () => {
      await result.current.handleCommit([story])
    })
    expect(result.current.error).toBe('Version conflict')
    expect(result.current.showModal).toBe(true)
  })

  it('no-ops when projectId or trackId is missing', async () => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch
    const { result } = renderHook(() => useStoryGeneration(undefined, 'tr1'))
    await act(async () => {
      await result.current.handleGenerate('')
      await result.current.handleCommit([story])
    })
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})
