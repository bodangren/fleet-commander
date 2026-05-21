import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockUseConvexQuery = vi.fn()

vi.mock('@/lib/useConvexData', () => ({
  useConvexQuery: (...args: unknown[]) => mockUseConvexQuery(...args),
}))

import { renderHook } from '@testing-library/react'
import { useProjectList } from './useProjectList'

describe('useProjectList', () => {
  beforeEach(() => {
    mockUseConvexQuery.mockReset()
  })

  it('calls useConvexQuery with projects:listProjectsHandler', () => {
    mockUseConvexQuery.mockReturnValue(undefined)
    renderHook(() => useProjectList())
    expect(mockUseConvexQuery).toHaveBeenCalledWith('projects:listProjectsHandler', {}, true)
  })

  it('returns loading state when data is undefined', () => {
    mockUseConvexQuery.mockReturnValue(undefined)
    const { result } = renderHook(() => useProjectList())
    expect(result.current.loading).toBe(true)
    expect(result.current.projects).toEqual([])
  })

  it('transforms and returns projects when data arrives', () => {
    mockUseConvexQuery.mockReturnValue([
      { _id: 'p1', name: 'Project 1', description: 'Desc 1', createdAt: 1000, updatedAt: 1000 },
      { _id: 'p2', name: 'Project 2', description: 'Desc 2', createdAt: 2000, updatedAt: 2000 },
    ])
    const { result } = renderHook(() => useProjectList())
    expect(result.current.loading).toBe(false)
    expect(result.current.projects).toEqual([
      { id: 'p1', name: 'Project 1', description: 'Desc 1', createdAt: 1000, updatedAt: 1000 },
      { id: 'p2', name: 'Project 2', description: 'Desc 2', createdAt: 2000, updatedAt: 2000 },
    ])
    expect(result.current.error).toBeNull()
  })

  it('returns empty projects when data is empty array', () => {
    mockUseConvexQuery.mockReturnValue([])
    const { result } = renderHook(() => useProjectList())
    expect(result.current.loading).toBe(false)
    expect(result.current.projects).toEqual([])
    expect(result.current.error).toBeNull()
  })
})
