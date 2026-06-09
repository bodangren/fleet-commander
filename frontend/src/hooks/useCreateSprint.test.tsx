import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'

import { useCreateSprint } from '@/hooks/useCreateSprint'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = (await vi.importActual('react-router-dom')) as Record<string, unknown>
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>
}

describe('useCreateSprint', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    navigateMock.mockReset()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('exposes initial closed state', () => {
    const { result } = renderHook(() => useCreateSprint('proj-1'), { wrapper })
    expect(result.current.showNewSprint).toBe(false)
    expect(result.current.newSprintSaving).toBe(false)
    expect(result.current.newSprintError).toBeNull()
  })

  it('openNewSprint clears error and shows modal', () => {
    const { result } = renderHook(() => useCreateSprint('proj-1'), { wrapper })
    act(() => result.current.openNewSprint())
    expect(result.current.showNewSprint).toBe(true)
    expect(result.current.newSprintError).toBeNull()
  })

  it('handleCreateSprint POSTs to the route and navigates with track query on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ projectSlug: 'demo', trackId: 'my_sprint_20260610' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    ) as unknown as typeof fetch

    const { result } = renderHook(() => useCreateSprint('proj-1'), { wrapper })
    await act(async () => {
      await result.current.handleCreateSprint({ title: 'My Sprint', goal: 'Ship it' })
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/projects/proj-1/tracks',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'My Sprint', goal: 'Ship it' }),
      }),
    )
    expect(navigateMock).toHaveBeenCalledWith('/project/proj-1?track=my_sprint_20260610')
    expect(result.current.showNewSprint).toBe(false)
    expect(result.current.newSprintError).toBeNull()
  })

  it('captures server error message on failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Track already exists' }), {
        status: 409,
        headers: { 'content-type': 'application/json' },
      }),
    ) as unknown as typeof fetch

    const { result } = renderHook(() => useCreateSprint('proj-1'), { wrapper })
    await act(async () => {
      await result.current.handleCreateSprint({ title: 'Dup', goal: 'g' })
    })

    expect(result.current.newSprintError).toBe('Track already exists')
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('no-ops when projectId is undefined', async () => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch
    const { result } = renderHook(() => useCreateSprint(undefined), { wrapper })
    await act(async () => {
      await result.current.handleCreateSprint({ title: 't', goal: 'g' })
    })
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})
