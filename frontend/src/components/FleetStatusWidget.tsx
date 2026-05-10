import { Link } from 'react-router-dom'

import { Card, CardContent } from '@/components/ui/card'
import { useFleetStatus } from '@/lib/useFleetApi'

function MetricCard({
  label,
  value,
  to,
  accent,
}: {
  label: string
  value: string | number
  to?: string
  accent?: string
}) {
  const content = (
    <div className="flex flex-col gap-2 p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </p>
      <p className={`text-4xl font-black italic tracking-tighter tabular-nums ${accent ?? ''}`}>
        {value}
      </p>
    </div>
  )

  if (to) {
    return (
      <Link to={to} className="block">
        <Card className="border-4 border-border bg-card transition-all duration-150 hover:border-primary hover:shadow-[6px_6px_0px_0px_hsl(var(--secondary))]">
          {content}
        </Card>
      </Link>
    )
  }

  return <Card className="border-4 border-border bg-card">{content}</Card>
}

export function FleetStatusWidget() {
  const { data, loading, error } = useFleetStatus()

  if (error) {
    return (
      <Card className="border-4 border-destructive bg-card p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-destructive">
          FLEET_STATUS_ERROR
        </p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </Card>
    )
  }

  if (loading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-4 border-border bg-card animate-pulse">
            <CardContent className="p-6">
              <div className="h-3 w-20 bg-muted mb-4" />
              <div className="h-8 w-12 bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="ACTIVE" value={data.activeTasks} to="/ops" />
        <MetricCard
          label="BLOCKED"
          value={data.blockedTasks}
          to="/blockers"
          accent={data.blockedTasks > 0 ? 'text-destructive' : undefined}
        />
        <MetricCard label="OPEN_ISSUES" value={data.openIssues} to="/blockers" />
        <MetricCard label="RUNNING" value={data.activeRuns} to="/ops" />
        <MetricCard label="TODAY_COST" value={`$${data.todayCost.toFixed(2)}`} to="/costs" />
        <MetricCard
          label="ATTENTION"
          value={data.attentionProjects.length}
          to="/blockers"
          accent={data.attentionProjects.length > 0 ? 'text-destructive' : undefined}
        />
      </div>

      {data.attentionProjects.length > 0 && (
        <Card className="border-4 border-destructive/50 bg-card">
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-destructive mb-3">
              NEEDS_ATTENTION
            </p>
            <div className="flex flex-wrap gap-2">
              {data.attentionProjects.map(p => (
                <Link
                  key={p.slug}
                  to={`/project/${encodeURIComponent(p.slug)}`}
                  className="border-2 border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-destructive hover:border-destructive transition-colors"
                >
                  {p.name} — {p.reason}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
