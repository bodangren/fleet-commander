import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { useAnalyticsFilters } from '@/lib/AnalyticsFiltersContext'
import { useRegressionAlerts } from '@/lib/useConvexRealtime'

interface RegressionData {
  agent: string
  taskKind: string
  baselineAvgMs: number
  currentAvgMs: number
  degradationPercent: number
  sampleCount: number
  threshold: number
}

/**
 * Displays bar chart comparing baseline vs current avg duration for regression alerts
 */
export function RegressionTrendChart() {
  const { filters } = useAnalyticsFilters()
  const { days, projectSlug } = filters
  const data = useRegressionAlerts({ days, projectSlug })

  if (data === undefined) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  const regressions = data as RegressionData[]

  if (regressions.length === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Regression Alerts</CardTitle>
          <CardDescription>Performance regression detection vs baseline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            No regressions detected
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = regressions.map(r => ({
    agent: `${r.agent.slice(0, 12)}`,
    taskKind: r.taskKind,
    baseline: r.baselineAvgMs,
    current: r.currentAvgMs,
    degradation: r.degradationPercent,
  }))

  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Regression Alerts</CardTitle>
        <CardDescription>
          Current vs baseline avg duration (&gt;{((regressions[0]?.threshold ?? 20) / 100) * 100}%
          degradation)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} barGap={8}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="agent" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value: number) =>
                value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={value => {
                const ms = Number(value) || 0
                return [ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`]
              }}
            />
            <Legend />
            <ReferenceLine yAxisId="y" y={0} stroke="hsl(var(--destructive))" strokeWidth={2} />
            <Bar
              dataKey="baseline"
              fill="hsl(var(--chart-2))"
              name="Baseline"
              radius={[4, 4, 0, 0]}
              yAxisId="y"
            />
            <Bar
              dataKey="current"
              fill="hsl(var(--destructive))"
              name="Current"
              radius={[4, 4, 0, 0]}
              yAxisId="y"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
