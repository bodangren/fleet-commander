import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { AgentPerformanceHistory } from '@/lib/convex-realtime/leaderboard'

interface AgentPerformanceChartProps {
  data: AgentPerformanceHistory
  onBack?: () => void
}

/**
 * Renders a sparkline-style performance chart for a single agent over time.
 */
export function AgentPerformanceChart({ data, onBack }: AgentPerformanceChartProps) {
  if (data.dailySnapshots.length === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No historical data available for this agent.</p>
        </CardContent>
      </Card>
    )
  }

  const snapshots = data.dailySnapshots
  const maxScore = Math.max(...snapshots.map(s => s.compositeScore), 0.01)

  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{data.agentName}</CardTitle>
            <CardDescription>
              {data.role} · {data.model} · {snapshots.length}-day performance history
            </CardDescription>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors"
            >
              Back to Leaderboard
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Sparkline */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Composite Score</h4>
          <div className="flex items-end gap-1 h-32">
            {snapshots.map((snapshot, i) => {
              const height = maxScore > 0 ? (snapshot.compositeScore / maxScore) * 100 : 0
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1"
                  title={`${snapshot.date}: ${(snapshot.compositeScore * 100).toFixed(0)}`}
                >
                  <div
                    className="w-full rounded-t bg-primary/80 transition-all hover:bg-primary min-h-[2px]"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  {i % Math.max(1, Math.floor(snapshots.length / 7)) === 0 && (
                    <span className="text-[10px] text-muted-foreground -rotate-45 origin-top-left whitespace-nowrap">
                      {snapshot.date.slice(5)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Metric Breakdown Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricMiniChart
            label="Cost/Point"
            unit="$"
            values={snapshots.map(s => s.costPerPoint)}
            dates={snapshots.map(s => s.date)}
          />
          <MetricMiniChart
            label="Rejection Rate"
            unit="%"
            values={snapshots.map(s => s.rejectionRate * 100)}
            dates={snapshots.map(s => s.date)}
          />
          <MetricMiniChart
            label="Throughput"
            unit="/d"
            values={snapshots.map(s => s.throughput)}
            dates={snapshots.map(s => s.date)}
          />
          <MetricMiniChart
            label="Merge Rate"
            unit="%"
            values={snapshots.map(s => s.mergeRate * 100)}
            dates={snapshots.map(s => s.date)}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function MetricMiniChart({
  label,
  unit,
  values,
  dates,
}: {
  label: string
  unit: string
  values: number[]
  dates: string[]
  lowerIsBetter?: boolean
}) {
  const nonZero = values.filter(v => v > 0)
  const latest = nonZero.length > 0 ? nonZero[nonZero.length - 1] : 0
  const max = Math.max(...values, 0.01)
  const avg = nonZero.length > 0 ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0

  return (
    <div className="rounded-lg border border-border/50 p-3">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-xl font-bold tabular-nums">
        {unit === '$' ? `$${latest.toFixed(2)}` : `${latest.toFixed(1)}${unit}`}
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        avg {unit === '$' ? `$${avg.toFixed(2)}` : `${avg.toFixed(1)}${unit}`}
      </div>
      {/* Mini sparkline */}
      <div className="flex items-end gap-px h-8 mt-2">
        {values.map((v, i) => {
          const height = max > 0 ? (v / max) * 100 : 0
          return (
            <div
              key={i}
              className="flex-1 rounded-t bg-primary/40 min-h-[1px]"
              style={{ height: `${Math.max(height, 1)}%` }}
              title={`${dates[i]}: ${unit === '$' ? `$${v.toFixed(2)}` : `${v.toFixed(1)}${unit}`}`}
            />
          )
        })}
      </div>
    </div>
  )
}
