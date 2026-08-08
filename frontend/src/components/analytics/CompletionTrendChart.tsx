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
import { useCompletionTrends } from '@/lib/useConvexRealtime'

/**
 * Renders a chart visualization
 */
export function CompletionTrendChart() {
  const { filters } = useAnalyticsFilters()
  const { days, projectSlug, agent, priority } = filters
  const data = useCompletionTrends({ days, projectSlug, agent, priority })

  if (data === undefined) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  const typedData = data as Array<{
    date: string
    completed: number
    failed: number
    created: number
  }>

  if (typedData.length === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Completion Trends</CardTitle>
          <CardDescription>Tasks completed vs failed over time</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            No completion data yet. Completion trends populate after tasks are recorded.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Completion Trends</CardTitle>
        <CardDescription>Tasks completed vs failed over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={typedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value: string) => value?.slice(5) ?? ''}
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
            <Line
              type="monotone"
              dataKey="completed"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={false}
              name="Completed"
            />
            <Line
              type="monotone"
              dataKey="failed"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              dot={false}
              name="Failed"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
