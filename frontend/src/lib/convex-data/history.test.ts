import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock the low-level Convex subscription hook so we can capture the path
// string passed in by each history query. The current implementation in
// `history.ts` passes the wrong module prefix (`history:...`) instead of
// the Convex-namespace format (`history/<slice>:...`) — these tests
// assert the corrected paths (STORY-R1).
vi.mock('@/lib/convex-data/core', () => ({
  useConvexQuery: vi.fn(),
}))

// Force the slice config to `convex` so `enabled` resolves to a boolean
// derived only from the projectId/limit args (avoids relying on
// import.meta.env in jsdom).
vi.mock('@/lib/dataAdapter', () => ({
  getSliceConfig: () => ({
    projects: 'convex',
    agents: 'convex',
    harnesses: 'convex',
    tasks: 'convex',
    issues: 'convex',
    logs: 'convex',
    settings: 'convex',
  }),
}))

import { useConvexQuery } from '@/lib/convex-data/core'
import { useAgentHistoryQuery, useSprintHistoryQuery, useTaskHistoryQuery } from './history'

const useConvexQueryMock = useConvexQuery as ReturnType<typeof vi.fn>

describe('history query hooks — Convex API path contract (STORY-R1)', () => {
  it('useSprintHistoryQuery subscribes to history/sprints:listSprintHistory', () => {
    useConvexQueryMock.mockReturnValue(undefined)

    renderHook(() => useSprintHistoryQuery({ projectId: 'project-1', limit: 50 }))

    expect(useConvexQueryMock).toHaveBeenCalledWith(
      'history/sprints:listSprintHistory',
      expect.objectContaining({ projectId: 'project-1', limit: 50 }),
      expect.any(Boolean),
    )
  })

  it('useAgentHistoryQuery subscribes to history/agents:listAgentHistory', () => {
    useConvexQueryMock.mockReturnValue(undefined)

    renderHook(() => useAgentHistoryQuery({ limit: 50 }))

    expect(useConvexQueryMock).toHaveBeenCalledWith(
      'history/agents:listAgentHistory',
      expect.objectContaining({ limit: 50 }),
      expect.any(Boolean),
    )
  })

  it('useTaskHistoryQuery subscribes to history/tasks:listTaskHistory', () => {
    useConvexQueryMock.mockReturnValue(undefined)

    renderHook(() =>
      useTaskHistoryQuery({
        projectId: 'project-1',
        status: 'done',
        search: 'auth',
        limit: 50,
      }),
    )

    expect(useConvexQueryMock).toHaveBeenCalledWith(
      'history/tasks:listTaskHistory',
      expect.objectContaining({
        projectId: 'project-1',
        status: 'done',
        search: 'auth',
        limit: 50,
      }),
      expect.any(Boolean),
    )
  })
})
