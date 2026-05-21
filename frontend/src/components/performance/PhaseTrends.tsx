import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useAnalyticsFilters } from '@/lib/AnalyticsFiltersContext'
import { usePhaseTrends } from '@/lib/useConvexRealtime'

export function PhaseTrends() {
  const { filters } = useAnalyticsFilters()
  const { days, projectSlug, agent } = filters
  const data = usePhaseTrends({ days, projectSlug, agent })

  if (data === undefined) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Phase Trends</CardTitle>
        <CardDescription>Daily average latency by pipeline phase</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data as object[]}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value: string) => value.slice(5)}
            />
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
                return [ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`]
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="loadAvg"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={false}
              name="Load"
            />
            <Line
              type="monotone"
              dataKey="scoreAvg"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={false}
              name="Score"
            />
            <Line
              type="monotone"
              dataKey="executeAvg"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
              dot={false}
              name="Execute"
            />
            <Line
              type="monotone"
              dataKey="persistAvg"
              stroke="hsl(var(--chart-4))"
              strokeWidth={2}
              dot={false}
              name="Persist"
            />
            <Line
              type="monotone"
              dataKey="hookBeforeAvg"
              stroke="hsl(var(--chart-5))"
              strokeWidth={2}
              dot={false}
              name="Hook Before"
            />
            <Line
              type="monotone"
              dataKey="hookAfterAvg"
              stroke="hsl(var(--chart-6))"
              strokeWidth={2}
              dot={false}
              name="Hook After"
            />
            <Line
              type="monotone"
              dataKey="totalAvg"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              dot={false}
              name="Total"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
