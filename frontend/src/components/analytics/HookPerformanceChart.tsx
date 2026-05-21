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
} from 'recharts'
import { useAnalyticsFilters } from '@/lib/AnalyticsFiltersContext'
import { useHookMetrics } from '@/lib/useConvexRealtime'

interface HookMetric {
  date: string
  phase: string
  executions: number
  failures: number
}

export function HookPerformanceChart() {
  const { filters } = useAnalyticsFilters()
  const { days, projectSlug } = filters
  const data = useHookMetrics({ days, projectSlug })

  if (data === undefined) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  // Aggregate by date: sum executions and failures across all phases
  const typedData = data as HookMetric[]
  const dateMap = new Map<string, { executions: number; failures: number }>()
  for (const entry of typedData) {
    const existing = dateMap.get(entry.date) ?? { executions: 0, failures: 0 }
    existing.executions += entry.executions
    existing.failures += entry.failures
    dateMap.set(entry.date, existing)
  }
  const chartData = Array.from(dateMap.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Hook Performance</CardTitle>
        <CardDescription>Lifecycle hook executions and failures over time</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hook execution data yet. Hook metrics populate after lifecycle hooks run.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value: string) => value.slice(5)}
              />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar
                dataKey="executions"
                fill="hsl(var(--chart-1))"
                name="Executions"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="failures"
                fill="hsl(var(--destructive))"
                name="Failures"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
