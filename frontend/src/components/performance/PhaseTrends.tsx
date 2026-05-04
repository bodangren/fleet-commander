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

interface TrendData {
  date: string
  loadAvg: number
  scoreAvg: number
  executeAvg: number
  persistAvg: number
  hookBeforeAvg: number
  hookAfterAvg: number
  totalAvg: number
}

export function PhaseTrends() {
  const { filters } = useAnalyticsFilters()
  const { days, projectSlug, agent, autoRefresh, refreshInterval } = filters
  const [data, setData] = useState<TrendData[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(() => {
    const params = new URLSearchParams({ days: String(days) })
    if (projectSlug) params.set('projectSlug', projectSlug)
    if (agent) params.set('agent', agent)

    fetch(`/api/performance/phase-trends?${params}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then(setData)
      .catch(err => setError(err.message))
  }, [days, projectSlug, agent])

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

  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Phase Trends</CardTitle>
        <CardDescription>Daily average latency by pipeline phase</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
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
              formatter={(value) => {
                const ms = Number(value) || 0;
                return [ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`];
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
