import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { LeaderboardEntry } from '@/lib/convex-realtime/leaderboard'

const BADGE_CONFIG: Record<string, { emoji: string; label: string }> = {
  top_performer: { emoji: '🥇', label: 'Top Performer' },
  most_improved: { emoji: '📈', label: 'Most Improved' },
  most_efficient: { emoji: '💰', label: 'Most Efficient' },
}

const TREND_CONFIG: Record<string, { symbol: string; color: string }> = {
  up: { symbol: '↑', color: 'text-green-400' },
  down: { symbol: '↓', color: 'text-red-400' },
  flat: { symbol: '→', color: 'text-muted-foreground' },
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  onSelectAgent?: (entry: LeaderboardEntry) => void
}

/**
 * Renders a ranked leaderboard table with trend arrows, composite scores, and badges.
 */
export function LeaderboardTable({ entries, onSelectAgent }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No agent data available for the selected filters.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Agent Rankings</CardTitle>
        <CardDescription>
          Composite performance score weighted by cost efficiency (40%), rejection rate (30%),
          throughput (20%), and merge rate (10%)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Rank
                </th>
                <th className="p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Agent
                </th>
                <th className="p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Role
                </th>
                <th className="p-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Score
                </th>
                <th className="p-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Cost/Point
                </th>
                <th className="p-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Rejection
                </th>
                <th className="p-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Throughput
                </th>
                <th className="p-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Merge Rate
                </th>
                <th className="p-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Trend
                </th>
                <th className="p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Badges
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => {
                const trend = TREND_CONFIG[entry.trend] ?? TREND_CONFIG.flat
                return (
                  <tr
                    key={entry.agentId}
                    onClick={() => onSelectAgent?.(entry)}
                    className="border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-3">
                      <span className="text-lg font-bold text-primary">#{entry.rank}</span>
                    </td>
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{entry.agentName}</div>
                        <div className="text-xs text-muted-foreground">{entry.model}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">
                        {entry.role}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-lg font-bold tabular-nums">
                        {(entry.compositeScore * 100).toFixed(0)}
                      </span>
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      ${entry.metrics.costPerPoint.toFixed(2)}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {(entry.metrics.rejectionRate * 100).toFixed(0)}%
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {entry.metrics.throughput.toFixed(1)}/d
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {(entry.metrics.mergeRate * 100).toFixed(0)}%
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-lg font-bold ${trend.color}`}>{trend.symbol}</span>
                      {entry.previousRank !== null && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (was #{entry.previousRank})
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {entry.badges.map(badge => {
                          const config = BADGE_CONFIG[badge]
                          return config ? (
                            <span key={badge} title={config.label} className="text-base">
                              {config.emoji}
                            </span>
                          ) : null
                        })}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
