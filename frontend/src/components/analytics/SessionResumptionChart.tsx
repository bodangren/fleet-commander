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
import { useSessionMetrics } from '@/lib/useConvexRealtime'

interface SessionMetrics {
  totalTasks: number
  sessionBoundTasks: number
  resumptionRate: number
  activeSessions: number
  byDate: Array<{ date: string; newSessions: number; resumedSessions: number }>
}

/**
 * Renders a chart visualization
 */
export function SessionResumptionChart() {
  const { filters } = useAnalyticsFilters()
  const { days, projectSlug, agent, priority } = filters
  const data = useSessionMetrics({ days, projectSlug, agent, priority })

  if (data === undefined) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  const metrics = data as SessionMetrics
  const ratePercent = Math.round(metrics.resumptionRate * 100)

  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Session Resumption</CardTitle>
            <CardDescription>Opencode session continuity over time</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{ratePercent}%</div>
            <div className="text-xs text-muted-foreground">
              {metrics.activeSessions} active / {metrics.sessionBoundTasks} total
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {metrics.byDate.length === 0 ||
        metrics.byDate.every(d => d.newSessions === 0 && d.resumedSessions === 0) ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No session data yet. Session metrics populate after opencode sessions are captured.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.byDate}>
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
              <Line
                type="monotone"
                dataKey="newSessions"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={false}
                name="New Sessions"
              />
              <Line
                type="monotone"
                dataKey="resumedSessions"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={false}
                name="Resumed Sessions"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
