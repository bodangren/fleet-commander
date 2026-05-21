import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAnalyticsFilters } from '@/lib/AnalyticsFiltersContext'
import { useCostByProject } from '@/lib/useConvexRealtime'

export function CostByProjectChart() {
  const { filters } = useAnalyticsFilters()
  const { days, projectSlug } = filters
  const data = useCostByProject({ days, projectSlug })

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
        <CardTitle className="text-lg font-semibold">Cost by Project</CardTitle>
        <CardDescription>Total LLM cost per project</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data as object[]}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="projectSlug"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v: number) => `$${v.toFixed(2)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="totalCostUSD" fill="hsl(var(--chart-1))" name="Cost (USD)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
