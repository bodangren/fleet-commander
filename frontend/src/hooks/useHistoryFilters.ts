import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  buildHistoryQuery,
  parseFiltersFromURL,
  sanitizeSearchQuery,
  // type HistoryFilters,
} from '@/lib/historyFilters'

/**
 * Hook managing URL search params for history page filtering
 * @returns Filter state, setters for each filter, and buildQuery helper
 */
export function useHistoryFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(() => parseFiltersFromURL(searchParams), [searchParams])

  const setSearch = useCallback(
    (value: string) => {
      const sanitized = sanitizeSearchQuery(value)
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (sanitized) {
          next.set('search', sanitized)
        } else {
          next.delete('search')
        }
        return next
      })
    },
    [setSearchParams],
  )

  const setStatus = useCallback(
    (value: string) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (value) {
          next.set('status', value)
        } else {
          next.delete('status')
        }
        return next
      })
    },
    [setSearchParams],
  )

  const setProject = useCallback(
    (value: string) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (value) {
          next.set('project', value)
        } else {
          next.delete('project')
        }
        return next
      })
    },
    [setSearchParams],
  )

  const setAgent = useCallback(
    (value: string) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (value) {
          next.set('agent', value)
        } else {
          next.delete('agent')
        }
        return next
      })
    },
    [setSearchParams],
  )

  const setLimit = useCallback(
    (value: number) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        next.set('limit', String(value))
        return next
      })
    },
    [setSearchParams],
  )

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams())
  }, [setSearchParams])

  const buildQuery = useCallback(() => buildHistoryQuery(filters), [filters])

  return {
    filters,
    setSearch,
    setStatus,
    setProject,
    setAgent,
    setLimit,
    resetFilters,
    buildQuery,
  }
}
