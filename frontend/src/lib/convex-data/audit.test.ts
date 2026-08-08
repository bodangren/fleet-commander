import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

vi.mock('@/lib/convex-data/core', () => ({
  useConvexQueryState: vi.fn(),
}))

vi.mock('@/lib/dataAdapter', () => ({
  getSliceConfig: () => ({ projects: 'convex' }),
}))

import { useConvexQueryState } from './core'
import { useAuditEventsState } from './audit'

const useConvexQueryStateMock = useConvexQueryState as ReturnType<typeof vi.fn>

describe('useAuditEventsState', () => {
  it('subscribes to the implemented public audit handler', () => {
    useConvexQueryStateMock.mockReturnValue({ data: [], error: null })

    renderHook(() => useAuditEventsState(undefined, undefined, 100))

    expect(useConvexQueryStateMock).toHaveBeenCalledWith(
      'audit:listAuditEventsHandler',
      { type: undefined, agentId: undefined, limit: 100 },
      true,
    )
  })

  it('distinguishes query errors from loading', () => {
    useConvexQueryStateMock.mockReturnValue({ data: undefined, error: new Error('offline') })

    const { result } = renderHook(() => useAuditEventsState())

    expect(result.current.loading).toBe(false)
    expect(result.current.error?.message).toBe('offline')
  })
})
