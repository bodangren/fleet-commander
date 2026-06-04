import { Button } from '@/components/ui/button'

export interface LeaderboardFilters {
  role: string
  projectSlug: string
  timeRange: '7d' | '30d' | 'all'
}

interface LeaderboardFilterBarProps {
  filters: LeaderboardFilters
  onChange: (filters: LeaderboardFilters) => void
  projects?: Array<{ slug: string; name: string }>
}

const ROLES = ['', 'architect', 'executor', 'reviewer', 'merger']
const TIME_RANGES: Array<{ value: LeaderboardFilters['timeRange']; label: string }> = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'all', label: 'Past Year' },
]

/**
 * Filter bar for the leaderboard page with role, project, and time range selectors.
 */
export function LeaderboardFilterBar({
  filters,
  onChange,
  projects = [],
}: LeaderboardFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Role Filter */}
      <div className="flex items-center gap-2">
        <label htmlFor="role-filter" className="text-xs text-muted-foreground">
          Role
        </label>
        <select
          id="role-filter"
          value={filters.role}
          onChange={e => onChange({ ...filters, role: e.target.value })}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">All Roles</option>
          {ROLES.filter(Boolean).map(role => (
            <option key={role} value={role} className="capitalize">
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Project Filter */}
      <div className="flex items-center gap-2">
        <label htmlFor="project-filter" className="text-xs text-muted-foreground">
          Project
        </label>
        <select
          id="project-filter"
          value={filters.projectSlug}
          onChange={e => onChange({ ...filters, projectSlug: e.target.value })}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">All Projects</option>
          {projects.map(p => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Time Range Tabs */}
      <div className="flex items-center gap-1 ml-auto">
        {TIME_RANGES.map(tr => (
          <Button
            key={tr.value}
            variant={filters.timeRange === tr.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange({ ...filters, timeRange: tr.value })}
          >
            {tr.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
