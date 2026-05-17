import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ChartDataPoint {
  [key: string]: string | number
}

interface LineChartProps {
  data: ChartDataPoint[]
  xKey: string
  yKey: string
  title: string
}

export function LineChart({ data, xKey, yKey, title }: LineChartProps) {
  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground" data-testid="empty-state">
        No data available
      </div>
    )
  }

  return (
    <div>
      <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
        {title}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
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
            dataKey={yKey}
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--chart-1))' }}
            name={yKey}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}