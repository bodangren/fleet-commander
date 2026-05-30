import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ChartDataPoint {
  [key: string]: string | number
}

interface DonutChartProps {
  data: ChartDataPoint[]
  nameKey: string
  valueKey: string
  title: string
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

/**
 * Renders a chart visualization
 * @param data - Array of data points
 * @param nameKey - Key for segment names
 * @param valueKey - Key for segment values
 * @param title - Chart title
 */
export function DonutChart({ data, nameKey, valueKey, title }: DonutChartProps) {
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
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
