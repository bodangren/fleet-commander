import type { AgentHistoryItem } from '@/__fixtures__/historyFixtures'

export interface CostTrendChartProps {
  agents: AgentHistoryItem[]
}

/**
 * Renders bar chart showing agent costs with proportional heights and labels
 */
export function CostTrendChart({ agents }: CostTrendChartProps) {
  if (agents.length === 0) {
    return <div className="py-12 text-center text-muted-foreground">No cost data</div>
  }

  const maxCost = Math.max(...agents.map(a => a.totalCost), 1)

  return (
    <div className="space-y-4">
      <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
        Cost Trend
      </div>
      <div className="h-48 flex items-end gap-2">
        {agents.map(agent => (
          <div key={agent._id} className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-full bg-primary transition-all"
              style={{
                height: `${Math.min((agent.totalCost / maxCost) * 160, 160)}px`,
              }}
            />
            <span className="text-xs font-bold uppercase">{agent.displayName}</span>
            <span className="text-xs tabular-nums">{agent.totalCost.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
