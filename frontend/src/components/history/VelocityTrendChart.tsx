import type { SprintHistoryItem } from '@/types/history'

export interface VelocityTrendChartProps {
  sprints: SprintHistoryItem[]
}

export function VelocityTrendChart({ sprints }: VelocityTrendChartProps) {
  if (sprints.length === 0) {
    return <div className="py-12 text-center text-muted-foreground">No velocity data</div>
  }

  return (
    <div className="space-y-4">
      <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
        Velocity Trend
      </div>
      <div className="h-48 flex items-end gap-2">
        {sprints.map(sprint => (
          <div key={sprint._id} className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-full bg-primary transition-all"
              style={{
                height: `${Math.min(sprint.velocity * 40, 160)}px`,
              }}
            />
            <span className="text-xs font-bold uppercase">{sprint.name}</span>
            <span className="text-xs tabular-nums">{sprint.velocity.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
