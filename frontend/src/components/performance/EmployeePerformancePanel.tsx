import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'

export interface TaskKindMetric {
  taskKind: string
  avgDurationMs: number
  p50DurationMs: number
  p95DurationMs: number
  completionRate: number
  sampleCount: number
}

export interface RegressionAlert {
  taskKind: string
  metric: 'avgDurationMs' | 'completionRate'
  severity: 'critical' | 'warning' | 'info'
  degradationPercent: number
  baselineValue: number
  currentValue: number
}

export interface EmployeePerformancePanelProps {
  employeeId: string
  projectId: string
  metrics: TaskKindMetric[] | null
  regressions: RegressionAlert[]
  trend: number[]
  loading?: boolean
  error?: string | null
}

/**
 * Formats milliseconds as seconds or milliseconds string
 */
function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

/**
 * Renders a circular completion rate gauge
 */
function CompletionGauge({ rate }: { rate: number }) {
  const percent = Math.round(rate * 100)
  const circumference = 2 * Math.PI * 36
  const offset = circumference * (1 - rate)
  return (
    <div
      className="relative inline-flex items-center justify-center"
      data-testid="completion-rate-gauge"
    >
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-lg font-bold">{percent}%</span>
    </div>
  )
}

/**
 * Renders a regression alert badge with severity color
 */
function RegressionBadge({ alert }: { alert: RegressionAlert }) {
  return (
    <span
      key={`${alert.taskKind}-${alert.metric}`}
      data-testid="regression-alert-badge"
      className="inline-flex items-center rounded-full bg-destructive px-2.5 py-0.5 text-xs font-semibold text-destructive-foreground"
    >
      {alert.taskKind} {alert.metric === 'avgDurationMs' ? 'duration' : 'completion'} degraded{' '}
      {alert.degradationPercent}%
    </span>
  )
}

/**
 * Displays task-kind duration bar chart, completion gauge, and trend sparkline for an employee
 */
export function EmployeePerformancePanel({
  metrics,
  regressions,
  trend,
  loading,
}: EmployeePerformancePanelProps) {
  if (loading) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="ml-3 text-sm text-muted-foreground">Loading performance data...</span>
        </CardContent>
      </Card>
    )
  }

  if (!metrics || metrics.length === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="py-12 text-center text-muted-foreground">
          No performance data available
        </CardContent>
      </Card>
    )
  }

  const avgCompletionRate = metrics[0]?.completionRate ?? 0

  const chartData = metrics.map(m => ({
    name: m.taskKind,
    avgDuration: m.avgDurationMs,
    p50: m.p50DurationMs,
    p95: m.p95DurationMs,
  }))

  const sparklineData = trend.map((value, index) => ({
    window: index + 1,
    value,
  }))

  return (
    <div className="space-y-6">
      {regressions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {regressions.map(alert => (
            <RegressionBadge key={`${alert.taskKind}-${alert.metric}`} alert={alert} />
          ))}
        </div>
      )}

      <Card className="bg-card/80 backdrop-blur" data-testid="performance-bar-chart">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Duration by Task Kind</CardTitle>
          <CardDescription>Average, p50, and p95 duration (ms)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value: number) => formatMs(value)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={value => [formatMs(Number(value) || 0)]}
                />
                <Bar
                  dataKey="avgDuration"
                  fill="hsl(var(--chart-1))"
                  name="Avg"
                  radius={[4, 4, 0, 0]}
                />
                <Bar dataKey="p50" fill="hsl(var(--chart-2))" name="p50" radius={[4, 4, 0, 0]} />
                <Bar dataKey="p95" fill="hsl(var(--chart-3))" name="p95" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-4">
            {metrics.map(m => (
              <span
                key={m.taskKind}
                className="text-xs font-medium text-muted-foreground uppercase"
              >
                {m.taskKind}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Completion Rate</CardTitle>
            <CardDescription>Average across task kinds</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <CompletionGauge rate={avgCompletionRate} />
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur" data-testid="performance-trend-sparkline">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Trend (Last 4 Windows)</CardTitle>
            <CardDescription>Average duration over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value: number) => formatMs(value)}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: 12,
                    }}
                    formatter={value => [formatMs(Number(value) || 0)]}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
