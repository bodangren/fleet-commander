import { useMemo, useState } from 'react'

import { useConvexQuery } from '@/lib/useConvexData'

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

export function usePortfolioData() {
  const data = useConvexQuery<PortfolioProject[]>('portfolio:getPortfolioHandler', {}, true)
  return data
}

export function usePortfolioFilters(projects: PortfolioProject[] | undefined) {
  const [search, setSearch] = useState('')
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all')

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
