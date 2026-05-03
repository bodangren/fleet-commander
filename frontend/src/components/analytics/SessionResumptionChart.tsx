import { useEffect, useState, useRef, useCallback } from 'react'
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

interface SessionByDate {
  date: string
  newSessions: number
  resumedSessions: number
}

interface SessionMetrics {
  totalTasks: number
  sessionBoundTasks: number
  resumptionRate: number
  activeSessions: number
  byDate: SessionByDate[]
}

export function SessionResumptionChart() {
  const { filters } = useAnalyticsFilters()
  const { days, projectSlug, autoRefresh, refreshInterval } = filters
  const [data, setData] = useState<SessionMetrics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(() => {
    const params = new URLSearchParams({ days: String(days) })
    if (projectSlug) params.set('projectSlug', projectSlug)

    fetch(`/api/analytics/session-metrics?${params}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then(setData)
      .catch(err => setError(err.message))
  }, [days, projectSlug])

  useEffect(() => {
    setError(null)
    setData(null)
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, refreshInterval)
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [autoRefresh, refreshInterval, fetchData])

  if (error) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="py-8 text-center text-muted-foreground">{error}</CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  const ratePercent = Math.round(data.resumptionRate * 100)

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
              {data.activeSessions} active / {data.sessionBoundTasks} total
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.byDate.length === 0 ||
        data.byDate.every(d => d.newSessions === 0 && d.resumedSessions === 0) ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No session data yet. Session metrics populate after opencode sessions are captured.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.byDate}>
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
