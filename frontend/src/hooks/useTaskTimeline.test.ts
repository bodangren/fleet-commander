import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockUseConvexQuery = vi.fn()

vi.mock('@/lib/useConvexData', () => ({
  useConvexQuery: (...args: unknown[]) => mockUseConvexQuery(...args),
}))

import { renderHook } from '@testing-library/react'
import { useTaskTimeline } from './useTaskTimeline'

describe('useTaskTimeline', () => {
  beforeEach(() => {
    mockUseConvexQuery.mockReset()
  })

  it('returns null data when taskId is undefined', () => {
    mockUseConvexQuery.mockReturnValue(undefined)
    const { result } = renderHook(() => useTaskTimeline(undefined))
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('calls useConvexQuery with correct args when taskId provided', () => {
    mockUseConvexQuery.mockReturnValue(undefined)
    renderHook(() => useTaskTimeline('task-1'))
    expect(mockUseConvexQuery).toHaveBeenCalledWith(
      'taskTimeline:getTaskTimelineHandler',
      { taskId: 'task-1' },
      true,
    )
  })

  it('returns loading state when data is undefined', () => {
    mockUseConvexQuery.mockReturnValue(undefined)
    const { result } = renderHook(() => useTaskTimeline('task-1'))
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()
  })

  it('returns timeline data when available', () => {
    const mockData = {
      task: { _id: 'task-1', title: 'Test Task', status: 'in_progress' },
      pipelineRuns: [],
      agents: [],
      sprint: null,
      project: null,
    }
    mockUseConvexQuery.mockReturnValue(mockData)
    const { result } = renderHook(() => useTaskTimeline('task-1'))
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBeNull()
  })

  it('disables query when taskId is empty string', () => {
    mockUseConvexQuery.mockReturnValue(undefined)
    renderHook(() => useTaskTimeline(''))
    expect(mockUseConvexQuery).toHaveBeenCalledWith(
      'taskTimeline:getTaskTimelineHandler',
      {},
      false,
    )
  })
})
