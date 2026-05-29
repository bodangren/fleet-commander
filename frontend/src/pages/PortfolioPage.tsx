import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { usePortfolioData, usePortfolioFilters } from '@/hooks/usePortfolioData'
import type { HealthFilter, PortfolioProject } from '@/hooks/usePortfolioData'

const HEALTH_COLORS: Record<string, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
}

const HEALTH_LABELS: Record<string, string> = {
  green: 'Healthy',
  yellow: 'Degraded',
  red: 'Critical',
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function PortfolioCard({ project }: { project: PortfolioProject }) {
  const navigate = useNavigate()

  return (
    <Card className="group border-4 border-border bg-card transition-all duration-150 hover:-translate-x-1 hover:-translate-y-1 hover:border-primary hover:shadow-[12px_12px_0px_0px_hsl(var(--secondary))]">
      <Link to={`/project/${encodeURIComponent(project.slug)}`} className="block h-full">
        <CardHeader className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-2xl font-black italic tracking-tighter leading-none uppercase">
                {project.name}
              </h3>
              <p className="break-all text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {project.description}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase tracking-[0.3em] italic font-black ${
                project.health === 'green'
                  ? 'bg-green-500/15 text-green-400'
                  : project.health === 'yellow'
                    ? 'bg-yellow-500/15 text-yellow-400'
                    : 'bg-red-500/15 text-red-400'
              }`}
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${HEALTH_COLORS[project.health]}`}
              />
              {HEALTH_LABELS[project.health]}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-6 pt-0">
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center border-2 border-border bg-muted/30 p-2">
              <span className="text-2xl font-black italic tabular-nums">
                {project.totalSprints}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                SPRINTS
              </span>
            </div>
            <div className="flex flex-col items-center border-2 border-border bg-muted/30 p-2">
              <span className="text-2xl font-black italic tabular-nums text-primary">
                {formatCurrency(project.totalSpend)}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                SPEND
              </span>
            </div>
            <div className="flex flex-col items-center border-2 border-border bg-muted/30 p-2">
              <span className="text-2xl font-black italic tabular-nums">
                {project.lastSprint?.completedCount ?? 0}/{project.lastSprint?.taskCount ?? 0}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                DONE
              </span>
            </div>
          </div>

          {project.lastSprint && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  LAST SPRINT: {project.lastSprint.name}
                </span>
                <span
                  className={`text-[9px] font-mono ${
                    project.lastSprint.status === 'completed'
                      ? 'text-green-400'
                      : project.lastSprint.status === 'active'
                        ? 'text-blue-400'
                        : project.lastSprint.status === 'failed'
                          ? 'text-red-400'
                          : 'text-muted-foreground'
                  }`}
                >
                  {project.lastSprint.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                <span>
                  Budget: {formatCurrency(project.lastSprint.budget)} | Actual:{' '}
                  {formatCurrency(project.lastSprint.actualCost)}
                </span>
              </div>
            </div>
          )}

          <div className="text-[9px] text-muted-foreground italic">{project.healthReason}</div>

          <Button
            variant="outline"
            size="sm"
            className="w-full text-[10px] font-bold uppercase tracking-widest"
            onClick={e => {
              e.preventDefault()
              e.stopPropagation()
              navigate(`/sprint-planning?project=${encodeURIComponent(project._id)}`)
            }}
          >
            Start New Sprint
          </Button>
        </CardContent>
      </Link>
    </Card>
  )
}

function HealthFilterButton({
  label,
  value,
  current,
  onChange,
  color,
  count,
}: {
  label: string
  value: HealthFilter
  current: HealthFilter
  onChange: (f: HealthFilter) => void
  color?: string
  count?: number
}) {
  const isActive = current === value
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors border ${
        isActive
          ? 'bg-[#0f1011] text-[#f7f8f8] border-[#5e6ad2]'
          : 'text-[#8a8f98] border-[#23252a] hover:text-[#d0d6e0] hover:border-[#3a3d44]'
      }`}
    >
      {color && <span className={`inline-block h-2 w-2 rounded-full ${color}`} />}
      {label}
      {count !== undefined && <span className="ml-1 text-[10px] text-[#62666d]">{count}</span>}
    </button>
  )
}

export function PortfolioPage() {
  const projects = usePortfolioData()
  const { search, setSearch, healthFilter, setHealthFilter, filtered, total } =
    usePortfolioFilters(projects)

  if (projects === undefined) {
    return (
      <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
        <div className="text-sm font-medium">Loading portfolio...</div>
        <div className="text-sm text-[#8a8f98] mt-1">
          Fetching project health data from all sprints.
        </div>
      </div>
    )
  }

  const greenCount = projects.filter(p => p.health === 'green').length
  const yellowCount = projects.filter(p => p.health === 'yellow').length
  const redCount = projects.filter(p => p.health === 'red').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-[rgba(94,106,210,0.15)] text-[#5e6ad2]">
              PORTFOLIO
            </span>
            <h1 className="text-3xl font-semibold tracking-tight">All Projects</h1>
            <div className="text-sm text-[#8a8f98]">
              {total} project{total !== 1 ? 's' : ''} across your fleet
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-[#141516] rounded-lg p-4">
            <div className="text-xs text-[#8a8f98] uppercase tracking-wider">Total</div>
            <div className="text-2xl font-semibold mt-1">{total}</div>
          </div>
          <div className="bg-[#141516] rounded-lg p-4">
            <div className="text-xs text-[#8a8f98] uppercase tracking-wider">Healthy</div>
            <div className="text-2xl font-semibold mt-1 text-green-400">{greenCount}</div>
          </div>
          <div className="bg-[#141516] rounded-lg p-4">
            <div className="text-xs text-[#8a8f98] uppercase tracking-wider">Degraded</div>
            <div className="text-2xl font-semibold mt-1 text-yellow-400">{yellowCount}</div>
          </div>
          <div className="bg-[#141516] rounded-lg p-4">
            <div className="text-xs text-[#8a8f98] uppercase tracking-wider">Critical</div>
            <div className="text-2xl font-semibold mt-1 text-red-400">{redCount}</div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 text-sm bg-[#0f1011] border border-[#23252a] rounded-md text-[#f7f8f8] placeholder:text-[#62666d] focus:outline-none focus:border-[#5e6ad2]"
        />
        <div className="flex gap-2">
          <HealthFilterButton
            label="All"
            value="all"
            current={healthFilter}
            onChange={setHealthFilter}
            count={total}
          />
          <HealthFilterButton
            label="Healthy"
            value="green"
            current={healthFilter}
            onChange={setHealthFilter}
            color="bg-green-500"
            count={greenCount}
          />
          <HealthFilterButton
            label="Degraded"
            value="yellow"
            current={healthFilter}
            onChange={setHealthFilter}
            color="bg-yellow-500"
            count={yellowCount}
          />
          <HealthFilterButton
            label="Critical"
            value="red"
            current={healthFilter}
            onChange={setHealthFilter}
            color="bg-red-500"
            count={redCount}
          />
        </div>
      </div>

      {/* Project Grid */}
      {filtered && filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(project => (
            <PortfolioCard key={project._id} project={project} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6 text-center">
          <div className="text-sm text-[#8a8f98]">
            {projects.length === 0
              ? 'No projects found. Create a project to get started.'
              : 'No projects match your search criteria.'}
          </div>
          {projects.length === 0 && (
            <Button asChild size="sm" className="mt-4">
              <Link to="/settings">Go to Settings</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
