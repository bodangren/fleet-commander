import type { MockActivityItem } from '@/__fixtures__/dashboardFixtures'

import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'

function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`
}

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface ActivityRowProps {
  activity: MockActivityItem
}

function ActivityRow({ activity }: ActivityRowProps) {
  const typeStyles: Record<MockActivityItem['type'], string> = {
    merge: 'border-l-4 border-l-green-500 bg-green-500/5',
    dispatch: 'border-l-4 border-l-blue-500 bg-blue-500/5',
    blocked: 'border-l-4 border-l-red-500 bg-red-500/5',
  }

  return (
    <div
      data-activity-type={activity.type}
      className={cn(
        'flex items-start justify-between gap-3 border-2 border-border p-3',
        typeStyles[activity.type],
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className="font-bold text-sm truncate">{activity.task}</p>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{activity.agent}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {activity.cost > 0 && (
          <span className="text-xs font-mono tabular-nums">{formatCost(activity.cost)}</span>
        )}
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(activity.timestamp)}
        </span>
      </div>
    </div>
  )
}

export function RecentActivity({ activities }: { activities: MockActivityItem[] }) {
  if (activities.length === 0) {
    return (
      <div className="border-2 border-border bg-card p-6">
        <EmptyState text="No recent activity" />
      </div>
    )
  }

  return (
    <div className="border-2 border-border bg-card p-6">
      <div role="log" aria-label="Activity feed" className="overflow-y-auto max-h-64 space-y-2">
        {activities.map((activity, i) => (
          <ActivityRow key={i} activity={activity} />
        ))}
      </div>
    </div>
  )
}
