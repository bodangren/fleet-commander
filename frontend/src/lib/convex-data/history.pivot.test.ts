import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('@/lib/dataAdapter', () => ({
  getSliceConfig: () => ({
    projects: 'bun',
    agents: 'bun',
    harnesses: 'bun',
    tasks: 'bun',
    issues: 'bun',
    logs: 'bun',
    settings: 'bun',
  }),
}))

vi.mock('@/lib/convex-data/core', () => ({
  useConvexQuery: vi.fn(),
}))

import { useConvexQuery } from './core'
import { useSprintHistoryQuery, useTaskHistoryQuery } from './history'

const useConvexQueryMock = vi.mocked(useConvexQuery)

describe('history Pivot fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useConvexQueryMock.mockReturnValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the project-id scoped Pivot sprint endpoint when Bun is selected', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          _id: 'sprint-1',
          projectId: 'project/1',
          name: 'Imported sprint',
          status: 'closed',
          budget: 100,
          actualCost: 90,
          pointsDelivered: 4,
          pointsEstimated: 5,
          taskCount: 2,
          completedCount: 2,
          velocity: 2,
          createdAt: 100,
        },
      ],
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() =>
      useSprintHistoryQuery({ projectId: 'project/1', limit: 50 }),
    )

    await waitFor(() => expect(result.current?.[0].name).toBe('Imported sprint'))
    expect(fetchMock).toHaveBeenCalledWith('/api/history/projects/project%2F1/sprints?limit=50', {
      signal: expect.any(AbortSignal),
    })
    expect(useConvexQueryMock).toHaveBeenCalledWith(
      'history/sprints:listSprintHistoryHandler',
      { projectId: 'project/1', limit: 50 },
      false,
    )
  })

  it('uses the project-id scoped Pivot task endpoint and forwards filters', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          _id: 'task-1',
          projectId: 'project-1',
          description: 'Imported task',
          priority: 'medium',
          title: 'Imported task',
          status: 'done',
          projectSlug: 'imported',
          costEstimate: 10,
          storyPoints: 2,
          createdAt: 100,
          updatedAt: 200,
        },
      ],
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() =>
      useTaskHistoryQuery({
        projectId: 'project-1',
        status: 'done',
        search: 'Imported',
        limit: 25,
      }),
    )

    await waitFor(() => expect(result.current?.[0].title).toBe('Imported task'))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/history/projects/project-1/tasks?limit=25&status=done&search=Imported',
      { signal: expect.any(AbortSignal) },
    )
  })

  it('leaves failed Pivot reads undefined for the page timeout error state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Convex unavailable' }),
      }),
    )

    const { result } = renderHook(() => useTaskHistoryQuery({ projectId: 'project-1', limit: 50 }))

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(result.current).toBeUndefined()
  })
})
