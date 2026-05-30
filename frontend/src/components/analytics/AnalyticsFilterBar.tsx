import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { TimeRangeSelector } from './TimeRangeSelector'
import { useAnalyticsFilters } from '@/lib/AnalyticsFiltersContext'

interface Project {
  slug: string
  name: string
}

interface Agent {
  name: string
  displayName: string
}

/**
 * Filter bar with time range, project, agent, and priority selectors for analytics
 */
export function AnalyticsFilterBar() {
  const { filters, setDays, setProjectSlug, setAgent, setPriority, toggleAutoRefresh } =
    useAnalyticsFilters()
  const [projects, setProjects] = useState<Project[]>([])
  const [agents, setAgents] = useState<Agent[]>([])

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(setProjects)
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(setAgents)
      .catch(() => {})
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-3">
      <TimeRangeSelector value={filters.days} onChange={setDays} />

      <select
        value={filters.projectSlug}
        onChange={e => setProjectSlug(e.target.value)}
        className="h-7 rounded border border-input bg-background px-2 text-xs"
      >
        <option value="">All Projects</option>
        {projects.map(p => (
          <option key={p.slug} value={p.slug}>
            {p.name}
          </option>
        ))}
      </select>

      <select
        value={filters.agent}
        onChange={e => setAgent(e.target.value)}
        className="h-7 rounded border border-input bg-background px-2 text-xs"
      >
        <option value="">All Agents</option>
        {agents.map(a => (
          <option key={a.name} value={a.name}>
            {a.displayName || a.name}
          </option>
        ))}
      </select>

      <select
        value={filters.priority}
        onChange={e => setPriority(e.target.value)}
        className="h-7 rounded border border-input bg-background px-2 text-xs"
      >
        <option value="">All Priorities</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="low">Low</option>
      </select>

      <Button
        variant={filters.autoRefresh ? 'default' : 'outline'}
        size="sm"
        onClick={toggleAutoRefresh}
        className="px-3 py-1 text-xs"
      >
        {filters.autoRefresh ? '● Live' : '○ Live'}
      </Button>
    </div>
  )
}
