import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export interface AnalyticsFilters {
  days: number
  projectSlug: string
  agent: string
  priority: string
  autoRefresh: boolean
  refreshInterval: number
}

interface AnalyticsFiltersContextValue {
  filters: AnalyticsFilters
  setDays: (days: number) => void
  setProjectSlug: (slug: string) => void
  setAgent: (agent: string) => void
  setPriority: (priority: string) => void
  toggleAutoRefresh: () => void
  setRefreshInterval: (ms: number) => void
}

const defaultFilters: AnalyticsFilters = {
  days: 30,
  projectSlug: '',
  agent: '',
  priority: '',
  autoRefresh: false,
  refreshInterval: 30_000,
}

const AnalyticsFiltersContext = createContext<AnalyticsFiltersContextValue | null>(null)

/**
 * Provides analytics filters context to React tree
 * @param children - React children nodes
 * @returns Context provider for analytics filters
 */
export function AnalyticsFiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<AnalyticsFilters>(defaultFilters)

  const setDays = useCallback((days: number) => {
    setFilters(prev => ({ ...prev, days }))
  }, [])

  const setProjectSlug = useCallback((projectSlug: string) => {
    setFilters(prev => ({ ...prev, projectSlug }))
  }, [])

  const setAgent = useCallback((agent: string) => {
    setFilters(prev => ({ ...prev, agent }))
  }, [])

  const setPriority = useCallback((priority: string) => {
    setFilters(prev => ({ ...prev, priority }))
  }, [])

  const toggleAutoRefresh = useCallback(() => {
    setFilters(prev => ({ ...prev, autoRefresh: !prev.autoRefresh }))
  }, [])

  const setRefreshInterval = useCallback((refreshInterval: number) => {
    setFilters(prev => ({ ...prev, refreshInterval }))
  }, [])

  return (
    <AnalyticsFiltersContext.Provider
      value={{
        filters,
        setDays,
        setProjectSlug,
        setAgent,
        setPriority,
        toggleAutoRefresh,
        setRefreshInterval,
      }}
    >
      {children}
    </AnalyticsFiltersContext.Provider>
  )
}

/**
 * Returns current analytics filters from context
 * @returns Current analytics filters context value
 * @throws Error if used outside of AnalyticsFiltersProvider
 */
export function useAnalyticsFilters(): AnalyticsFiltersContextValue {
  const ctx = useContext(AnalyticsFiltersContext)
  if (!ctx) throw new Error('useAnalyticsFilters must be used within AnalyticsFiltersProvider')
  return ctx
}
