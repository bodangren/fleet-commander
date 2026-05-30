import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAnalyticsFilters } from '@/lib/AnalyticsFiltersContext'
import { useCostPerTask } from '@/lib/useConvexRealtime'

interface PerTaskData {
  totalCostUSD: number
  completedTasks: number
  costPerTask: number
}

/**
 * Card displaying cost per task with total cost and completion metrics
 */
export function BudgetGauge() {
  const { filters } = useAnalyticsFilters()
  const { days, projectSlug } = filters
  const data = useCostPerTask({ days, projectSlug })

  if (data === undefined) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  const metrics = data as PerTaskData

  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Cost per Task</CardTitle>
        <CardDescription>Average LLM cost per completed task</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-4xl font-bold">${metrics.costPerTask.toFixed(4)}</div>
          <div className="text-sm text-muted-foreground">Per Task</div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-semibold">${metrics.totalCostUSD.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Total Cost</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">{metrics.completedTasks}</div>
            <div className="text-xs text-muted-foreground">Completed Tasks</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
