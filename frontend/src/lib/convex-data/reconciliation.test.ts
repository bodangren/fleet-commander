import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

vi.mock('@/lib/convex-data/core', () => ({
  useConvexQueryState: vi.fn(),
}))

vi.mock('@/lib/dataAdapter', () => ({
  getSliceConfig: () => ({ projects: 'convex' }),
}))

import { useConvexQueryState } from './core'
import { useReconciliationProposalsState } from './reconciliation'

const useConvexQueryStateMock = useConvexQueryState as ReturnType<typeof vi.fn>

describe('useReconciliationProposalsState', () => {
  it('passes the selected project slug to the public query', () => {
    useConvexQueryStateMock.mockReturnValue({ data: [], error: null })

    renderHook(() => useReconciliationProposalsState('imported-project', 50))

    expect(useConvexQueryStateMock).toHaveBeenCalledWith(
      'reconciliationProposals:listPendingProposals',
      { projectSlug: 'imported-project', limit: 50 },
      true,
    )
  })

  it('does not treat a missing project as an active loading query', () => {
    useConvexQueryStateMock.mockReturnValue({ data: undefined, error: null })

    const { result } = renderHook(() => useReconciliationProposalsState(undefined, 50))

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual([])
  })
})
