import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { useCoverageHistory } from '@/lib/useConvexData'
import type { CoverageDisplay } from '@/lib/useConvexData'

interface CoverageChartProps {
  projectSlug: string
  history?: CoverageDisplay[]
  loading?: boolean
  onRefresh?: () => void
  threshold?: number
}

export function CoverageChart({
  projectSlug,
  history,
  loading,
  onRefresh,
  threshold,
}: CoverageChartProps) {
  const coverageHistory = useCoverageHistory(projectSlug, 50)

  const data = (history ?? coverageHistory ?? [])
    .slice()
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(record => ({
      date: record.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      percentage: record.percentage,
      fullDate: record.date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    }))

  const latestRecord = (history ?? coverageHistory ?? [])
    .slice()
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0]

  const handleRefresh = useCallback(() => {
    onRefresh?.()
  }, [onRefresh])

  if (loading) {
    return (
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Coverage Trend</CardTitle>
          <CardDescription>Loading coverage...</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading coverage...</p>
        </CardContent>
      </Card>
    )
  }

  if (!data.length) {
    return (
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Coverage Trend</CardTitle>
          <CardDescription>No coverage data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No coverage data</p>
        </CardContent>
      </Card>
    )
  }

  const dateRange =
    data.length >= 2
      ? `${data[0].fullDate} — ${data[data.length - 1].fullDate}`
      : (data[0]?.fullDate ?? '')

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-2">
          <CardTitle className="text-sm font-medium">Coverage Trend</CardTitle>
          <CardDescription>{dateRange}</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          {latestRecord && (
            <div className="text-right">
              <p className="text-2xl font-semibold">{latestRecord.percentage.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">{latestRecord.tool}</p>
            </div>
          )}
          {threshold && latestRecord && (
            <div
              className={`text-right ${latestRecord.percentage >= threshold ? 'text-emerald-400' : 'text-rose-400'}`}
            >
              <p className="text-xs font-medium">
                {latestRecord.percentage >= threshold ? '✓' : '✗'} {threshold}% threshold
              </p>
            </div>
          )}
          {onRefresh && (
            <Button type="button" variant="outline" size="sm" onClick={handleRefresh}>
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'currentColor' }}
                tickLine={false}
                axisLine={{ stroke: 'currentColor', strokeOpacity: 0.2 }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: 'currentColor' }}
                tickLine={false}
                axisLine={{ stroke: 'currentColor', strokeOpacity: 0.2 }}
                tickFormatter={value => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                formatter={value => [`${Number(value).toFixed(1)}%`, 'Coverage']}
              />
              <Line
                type="monotone"
                dataKey="percentage"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={{ fill: '#22d3ee', strokeWidth: 0, r: 3 }}
                activeDot={{ fill: '#22d3ee', strokeWidth: 2, stroke: '#fff', r: 5 }}
              />
              {threshold && (
                <ReferenceLine
                  y={threshold}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
