import { describe, expect, it, vi, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { useSaveAsTemplate } from '@/hooks/useSaveAsTemplate'
import type { ProjectDetail } from '@/lib/fleetTypes'

const mutationMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/convex', () => ({
  convexClient: { mutation: (...args: unknown[]) => mutationMock(...args) },
}))

const project = {
  id: 'p1',
  name: 'Demo',
  path: '/x',
  tracks: [
    {
      id: 't1',
      title: 'Track 1',
      status: 'new',
      phases: [
        {
          id: 'phase-1',
          title: 'Phase 1',
          tasks: [
            { id: 'task-1', description: 'Do thing', status: 'todo' },
            { id: 'task-2', description: 'Other', status: 'done' },
          ],
        },
      ],
    },
  ],
} as unknown as ProjectDetail

describe('useSaveAsTemplate', () => {
  afterEach(() => {
    mutationMock.mockClear()
  })

  it('starts closed', () => {
    const { result } = renderHook(() => useSaveAsTemplate(project))
    expect(result.current.showSaveAsTemplate).toBe(false)
  })

  it('flattens project tracks into tasks list', () => {
    const { result } = renderHook(() => useSaveAsTemplate(project))
    expect(result.current.tasks).toHaveLength(2)
    expect(result.current.tasks[0]).toEqual({
      _id: 'task-1',
      title: 'Do thing',
      storyPoints: 1,
      priority: 'medium',
      status: 'todo',
    })
  })

  it('open and close toggle modal state', () => {
    const { result } = renderHook(() => useSaveAsTemplate(project))
    act(() => result.current.openSaveAsTemplate())
    expect(result.current.showSaveAsTemplate).toBe(true)
    act(() => result.current.closeSaveAsTemplate())
    expect(result.current.showSaveAsTemplate).toBe(false)
  })

  it('handleSaveAsTemplate calls convex and closes the modal', async () => {
    const { result } = renderHook(() => useSaveAsTemplate(project))
    act(() => result.current.openSaveAsTemplate())
    await act(async () => {
      await result.current.handleSaveAsTemplate({
        name: 'Tmpl',
        description: '',
        category: 'general',
      } as never)
    })
    expect(mutationMock).toHaveBeenCalledTimes(1)
    expect(result.current.showSaveAsTemplate).toBe(false)
  })

  it('returns empty tasks for missing project', () => {
    const { result } = renderHook(() => useSaveAsTemplate(null))
    expect(result.current.tasks).toEqual([])
  })
})
