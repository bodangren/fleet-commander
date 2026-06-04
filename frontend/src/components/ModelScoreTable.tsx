import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ModelScore {
  model: string
  role: string
  taskType: string
  sampleCount: number
  avgCostPerPoint: number
  rejectionRate: number
  avgDurationMs: number
}

interface ModelScoreTableProps {
  scores: ModelScore[]
  loading?: boolean
}

/**
 * Displays a table of model performance scores with confidence indicators.
 * Shows cost, quality (rejection rate), and sample count per model/role/taskType.
 */
export function ModelScoreTable({ scores, loading }: ModelScoreTableProps) {
  if (loading) {
    return (
      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle>Model Performance</CardTitle>
          <CardDescription>Loading model scores...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (scores.length === 0) {
    return (
      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle>Model Performance</CardTitle>
          <CardDescription>
            No historical data available yet. Model scores will appear after tasks are executed.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const sorted = [...scores].sort((a, b) => b.sampleCount - a.sampleCount)

  return (
    <Card className="border-border/60 bg-background/60">
      <CardHeader>
        <CardTitle>Model Performance</CardTitle>
        <CardDescription>
          Historical model scores by role and task type. Higher confidence = more data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="pb-2 text-left font-medium text-muted-foreground">Model</th>
                <th className="pb-2 text-left font-medium text-muted-foreground">Role</th>
                <th className="pb-2 text-left font-medium text-muted-foreground">Task Type</th>
                <th className="pb-2 text-right font-medium text-muted-foreground">Samples</th>
                <th className="pb-2 text-right font-medium text-muted-foreground">Cost/Point</th>
                <th className="pb-2 text-right font-medium text-muted-foreground">Rejection %</th>
                <th className="pb-2 text-right font-medium text-muted-foreground">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((score, i) => {
                const confidence = Math.min(score.sampleCount / 10, 1)
                return (
                  <tr key={i} className="border-b border-border/20 last:border-0">
                    <td className="py-2 font-mono text-xs">{score.model}</td>
                    <td className="py-2 text-muted-foreground">{score.role}</td>
                    <td className="py-2 text-muted-foreground">{score.taskType}</td>
                    <td className="py-2 text-right tabular-nums">{score.sampleCount}</td>
                    <td className="py-2 text-right tabular-nums">
                      ${score.avgCostPerPoint.toFixed(3)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      <span
                        className={
                          score.rejectionRate > 0.2
                            ? 'text-red-400'
                            : score.rejectionRate > 0.1
                              ? 'text-yellow-400'
                              : 'text-emerald-400'
                        }
                      >
                        {(score.rejectionRate * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border/40">
                          <div
                            className="h-full rounded-full bg-cyan-400"
                            style={{ width: `${confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {(confidence * 100).toFixed(0)}%
                        </span>
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
