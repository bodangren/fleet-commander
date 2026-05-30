import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useAnalyticsFilters } from '@/lib/AnalyticsFiltersContext'
import { useBottlenecks } from '@/lib/useConvexRealtime'

interface BottleneckData {
  trackId: string
  projectSlug: string
  totalTasks: number
  failedTasks: number
  avgDurationMs: number
  failureRate: number
  lastActivityAt: number
}

/**
 * Analytics chart showing tracks ranked by failure rate and avg duration
 */
export function BottleneckChart() {
  const { filters } = useAnalyticsFilters()
  const { days, projectSlug, agent, priority } = filters
  const data = useBottlenecks({ days, projectSlug, agent, priority })

  if (data === undefined) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  const typedData = data as BottleneckData[]
  if (typedData.length === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  const chartData = typedData.slice(0, 10).map(item => ({
    name: item.trackId,
    failureRate: Math.round(item.failureRate * 100),
    avgDuration: Math.round(item.avgDurationMs / 1000),
    tasks: item.totalTasks,
  }))

  const getBarColor = (failureRate: number) => {
    if (failureRate > 50) return 'hsl(var(--destructive))'
    if (failureRate > 25) return 'hsl(var(--chart-4))'
    return 'hsl(var(--chart-1))'
  }

  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Bottlenecks</CardTitle>
        <CardDescription>Tracks ranked by failure rate and avg duration</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value: number) => `${value}%`}
            />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value, name) => {
                if (name === 'failureRate') return [`${value}%`, 'Failure Rate']
                return [value, name]
              }}
            />
            <Bar dataKey="failureRate" name="Failure Rate" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={getBarColor(entry.failureRate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
