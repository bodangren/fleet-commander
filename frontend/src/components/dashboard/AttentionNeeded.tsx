import type { MockAlert } from '@/__fixtures__/dashboardFixtures'

import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'

function AlertItem({ alert }: { alert: MockAlert }) {
  const severityStyles: Record<MockAlert['severity'], string> = {
    critical: 'bg-destructive/10 border-destructive/30 text-destructive',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
  }

  return (
    <div
      data-severity={alert.severity}
      className={cn('border-2 p-3 space-y-1', severityStyles[alert.severity])}
    >
      <p className="text-sm font-bold">{alert.message}</p>
      {alert.type && (
        <p className="text-xs uppercase tracking-wider opacity-70">
          {alert.type.replace('_', ' ')}
        </p>
      )}
    </div>
  )
}

export function AttentionNeeded({ alerts }: { alerts: MockAlert[] }) {
  const unresolved = alerts.filter(a => !a.resolved)

  if (unresolved.length === 0) {
    return (
      <div className="border-2 border-border bg-card p-6">
        <EmptyState text="All clear" />
      </div>
    )
  }

  return (
    <div className="border-2 border-border bg-card p-6 space-y-3">
      <div className="space-y-2">
        {unresolved.map((alert, i) => (
          <AlertItem key={i} alert={alert} />
        ))}
      </div>
    </div>
  )
}
