import { useState } from 'react'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAlerts } from '@/lib/useFleetApi'
import { cn } from '@/lib/utils'

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  warning: 'bg-secondary text-secondary-foreground',
  info: 'bg-muted text-muted-foreground',
}

const SEVERITY_ICONS: Record<string, string> = {
  critical: '◆',
  warning: '▲',
  info: '●',
}

/**
 * Formats milliseconds timestamp into locale-aware date string with month, day, hour, minute
 * @param ms - timestamp in milliseconds
 */
function formatTime(ms: number): string {
  const d = new Date(ms)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Alerts page component with severity filtering and alert resolution functionality
 */
export function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState<'critical' | 'warning' | 'info' | ''>('')
  const [resolvedFilter, setResolvedFilter] = useState<boolean | undefined>(undefined)

  const { data, loading, error, criticalCount, resolveAlert } = useAlerts(
    severityFilter || undefined,
    undefined,
    resolvedFilter,
  )

  const alerts = data ?? []

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex border-4 border-border">
          {(['critical', 'warning', 'info', ''] as const).map(sev => (
            <button
              key={sev}
              type="button"
              onClick={() => setSeverityFilter(sev)}
              className={cn(
                'px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors',
                severityFilter === sev
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              {sev || 'ALL'}
            </button>
          ))}
        </div>

        <div className="flex border-4 border-border">
          {(['all', 'active', 'resolved'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() =>
                setResolvedFilter(tab === 'active' ? false : tab === 'resolved' ? true : undefined)
              }
              className={cn(
                'px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors',
                (tab === 'all' && resolvedFilter === undefined) ||
                  (tab === 'active' && resolvedFilter === false) ||
                  (tab === 'resolved' && resolvedFilter === true)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {criticalCount > 0 && (
          <span className="bg-destructive text-destructive-foreground font-black px-3 py-1 text-xs uppercase tracking-widest">
            {criticalCount} CRITICAL
          </span>
        )}
      </div>

      {error && (
        <Card className="border-4 border-destructive bg-card p-6">
          <p className="text-sm text-destructive font-bold">ERROR: {error}</p>
        </Card>
      )}

      <Card className="border-4 border-border bg-card shadow-[8px_8px_0px_0px_hsl(var(--primary)/20)]">
        <CardHeader className="border-b-4 border-border bg-muted/30 p-6">
          <h3 className="text-3xl font-black italic tracking-tighter uppercase">ALERTS</h3>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mt-1">
            {alerts.length} TOTAL — {alerts.filter(a => !a.resolved).length} UNRESOLVED
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
              LOADING...
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
              NO_ALERTS
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {alerts.map(alert => (
                <div
                  key={alert._id}
                  className={cn(
                    'flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors',
                    alert.resolved && 'opacity-60',
                  )}
                >
                  <span
                    className={cn(
                      'font-black px-2 py-1 text-[10px] uppercase tracking-widest',
                      SEVERITY_COLORS[alert.severity] ?? SEVERITY_COLORS.info,
                    )}
                  >
                    {SEVERITY_ICONS[alert.severity] ?? '●'} {alert.severity.toUpperCase()}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{alert.message}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {alert.type.replace(/_/g, ' ')} — {formatTime(alert.createdAt)}
                    </p>
                  </div>

                  {!alert.resolved && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-[10px] font-black uppercase tracking-widest"
                      onClick={() => void resolveAlert(alert._id)}
                    >
                      RESOLVE
                    </Button>
                  )}

                  {alert.resolved && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-accent">
                      RESOLVED
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
