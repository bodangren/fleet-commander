import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useHistoryFilters } from './useHistoryFilters'

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {children}
    </MemoryRouter>
  )
}

describe('useHistoryFilters', () => {
  it('initializes with empty filters', () => {
    const { result } = renderHook(() => useHistoryFilters(), { wrapper })
    expect(result.current.filters).toEqual({})
  })

  it('reads filters from URL on mount', () => {
    const { result } = renderHook(() => useHistoryFilters(), {
      wrapper: ({ children }) => (
        <MemoryRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          initialEntries={['?search=auth&status=done']}
        >
          {children}
        </MemoryRouter>
      ),
    })
    expect(result.current.filters.search).toBe('auth')
    expect(result.current.filters.status).toBe('done')
  })

  it('setSearch updates filter state', () => {
    const { result } = renderHook(() => useHistoryFilters(), { wrapper })
    act(() => result.current.setSearch('bug'))
    expect(result.current.filters.search).toBe('bug')
  })

  it('setStatus updates filter state', () => {
    const { result } = renderHook(() => useHistoryFilters(), { wrapper })
    act(() => result.current.setStatus('in_progress'))
    expect(result.current.filters.status).toBe('in_progress')
  })

  it('setProject updates filter state', () => {
    const { result } = renderHook(() => useHistoryFilters(), { wrapper })
    act(() => result.current.setProject('foundation'))
    expect(result.current.filters.project).toBe('foundation')
  })

  it('setAgent updates filter state', () => {
    const { result } = renderHook(() => useHistoryFilters(), { wrapper })
    act(() => result.current.setAgent('alice'))
    expect(result.current.filters.agent).toBe('alice')
  })

  it('setLimit updates filter state', () => {
    const { result } = renderHook(() => useHistoryFilters(), { wrapper })
    act(() => result.current.setLimit(50))
    expect(result.current.filters.limit).toBe(50)
  })

  it('resetFilters clears all filters', () => {
    const { result } = renderHook(() => useHistoryFilters(), {
      wrapper: ({ children }) => (
        <MemoryRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          initialEntries={['?search=auth&status=done&project=foundation']}
        >
          {children}
        </MemoryRouter>
      ),
    })
    act(() => result.current.resetFilters())
    expect(result.current.filters).toEqual({})
  })

  it('buildQuery returns Convex-compatible query args', () => {
    const { result } = renderHook(() => useHistoryFilters(), {
      wrapper: ({ children }) => (
        <MemoryRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          initialEntries={['?search=auth&status=done&limit=20']}
        >
          {children}
        </MemoryRouter>
      ),
    })
    expect(result.current.buildQuery()).toEqual({
      search: 'auth',
      status: 'done',
      limit: 20,
    })
  })

  it('sanitizes search input before storing', () => {
    const { result } = renderHook(() => useHistoryFilters(), { wrapper })
    act(() => result.current.setSearch('<script>alert(1)</script>'))
    expect(result.current.filters.search).toBe('alert1')
  })
})
