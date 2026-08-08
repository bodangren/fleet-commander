import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { getSliceConfig } from '@/lib/dataAdapter'
import { useConvexQuery } from '@/lib/useConvexData'
import type { ProjectSummary } from '@/lib/fleetTypes'

export interface PortfolioProject {
  _id: string
  name: string
  slug: string
  description: string
  totalSprints: number
  lastSprint: {
    name: string
    status: string
    budget: number
    actualCost: number
    completedCount: number
    taskCount: number
    closedAt?: number
  } | null
  totalSpend: number
  health: 'green' | 'yellow' | 'red'
  healthReason: string
}

export type HealthFilter = 'all' | 'green' | 'yellow' | 'red'

const sliceConfig = getSliceConfig()

function summaryToPortfolioProject(project: ProjectSummary): PortfolioProject {
  return {
    _id: project.id,
    name: project.name,
    slug: project.slug ?? project.id,
    description: project.path,
    totalSprints: project.tracks.length,
    lastSprint: null,
    totalSpend: 0,
    health: 'green',
    healthReason: project.modelRoutingPolicy
      ? `Routing: ${project.modelRoutingPolicy}`
      : 'Loaded from API',
  }
}

/**
 * Hook fetching portfolio project list from the configured projects source.
 */
export function usePortfolioData() {
  const [searchParams] = useSearchParams()
  const convexData = useConvexQuery<PortfolioProject[]>(
    'portfolio:getPortfolioHandler',
    {},
    sliceConfig.projects === 'convex',
  )
  const [apiData, setApiData] = useState<PortfolioProject[] | undefined>(undefined)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => {
    setTick(t => t + 1)
  }, [])

  useEffect(() => {
    if (sliceConfig.projects !== 'bun') {
      setApiData(undefined)
      return
    }

    const controller = new AbortController()
    void (async () => {
      try {
        const response = await fetch('/api/projects', { signal: controller.signal })
        if (!response.ok) {
          throw new Error('Failed to load projects')
        }
        const projects = (await response.json()) as ProjectSummary[]
        setApiData(projects.map(summaryToPortfolioProject))
      } catch {
        if (!controller.signal.aborted) {
          setApiData([])
        }
      }
    })()

    return () => controller.abort()
  }, [tick])

  const projects = sliceConfig.projects === 'convex' ? convexData : apiData
  return { projects, projectParam: searchParams.get('project'), refresh }
}

/**
 * Hook managing portfolio filtering state by search query and health status
 */
export function usePortfolioFilters(projects: PortfolioProject[] | undefined) {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''
  const healthFilterParam = searchParams.get('health')
  const healthFilter: HealthFilter =
    healthFilterParam === 'green' || healthFilterParam === 'yellow' || healthFilterParam === 'red'
      ? healthFilterParam
      : 'all'

  const updateFilterParams = (updates: { q?: string; health?: HealthFilter }) => {
    setSearchParams(
      current => {
        const next = new URLSearchParams(current)
        if (updates.q !== undefined) {
          const q = updates.q.trim()
          if (q) next.set('q', q)
          else next.delete('q')
        }
        if (updates.health !== undefined) {
          if (updates.health === 'all') next.delete('health')
          else next.set('health', updates.health)
        }
        return next
      },
      { replace: true },
    )
  }

  const setSearch = (value: string) => updateFilterParams({ q: value })
  const setHealthFilter = (value: HealthFilter) => updateFilterParams({ health: value })

  const filtered = useMemo(() => {
    if (!projects) return undefined
    let result = projects

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        p => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
      )
    }

    if (healthFilter !== 'all') {
      result = result.filter(p => p.health === healthFilter)
    }

    return result
  }, [projects, search, healthFilter])

  return {
    search,
    setSearch,
    healthFilter,
    setHealthFilter,
    filtered,
    total: projects?.length ?? 0,
  }
}
