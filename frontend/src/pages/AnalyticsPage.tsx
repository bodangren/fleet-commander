import { useSprintHistory } from '@/hooks/useSprintHistory'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { VelocityTrendChart } from '@/components/history/VelocityTrendChart'
// import { SprintHistoryTable } from '@/components/history/SprintHistoryTable'

function calcCostPerPoint(sprint: { actualCost: number; pointsDelivered: number }) {
  if (sprint.pointsDelivered === 0) return 0
  return sprint.actualCost / sprint.pointsDelivered
}

function calcBudgetAccuracy(sprint: { budget: number; actualCost: number }) {
  if (sprint.budget === 0) return 0
  return ((sprint.budget - sprint.actualCost) / sprint.budget) * 100
}

function calcAvgCostPerPoint(sprints: { actualCost: number; pointsDelivered: number }[]) {
  const withPoints = sprints.filter(s => s.pointsDelivered > 0)
  if (withPoints.length === 0) return 0
  const total = withPoints.reduce((sum, s) => sum + s.actualCost / s.pointsDelivered, 0)
  return total / withPoints.length
}

function calcPointsPerDollar(sprints: { actualCost: number; pointsDelivered: number }[]) {
  const withCost = sprints.filter(s => s.actualCost > 0)
  if (withCost.length === 0) return 0
  const totalPoints = withCost.reduce((sum, s) => sum + s.pointsDelivered, 0)
  const totalCost = withCost.reduce((sum, s) => sum + s.actualCost, 0)
  if (totalCost === 0) return 0
  return totalPoints / totalCost
}

function calcAvgVelocity(sprints: { pointsDelivered: number }[]) {
  if (sprints.length === 0) return 0
  const total = sprints.reduce((sum, s) => sum + s.pointsDelivered, 0)
  return total / sprints.length
}

function calcAvgBudgetAccuracy(sprints: { budget: number; actualCost: number }[]) {
  const withBudget = sprints.filter(s => s.budget > 0)
  if (withBudget.length === 0) return 0
  const total = withBudget.reduce((sum, s) => {
    return sum + Math.abs((s.budget - s.actualCost) / s.budget) * 100
  }, 0)
  return 100 - total / withBudget.length
}

interface SprintWithMetrics {
  _id: string
  name: string
  status: 'planned' | 'active' | 'closed'
  startDate: number
  endDate: number
  budget: number
  actualCost: number
  pointsDelivered: number
  pointsEstimated: number
  taskCount: number
  completedCount: number
  velocity: number
  costPerPoint: number
  budgetAccuracy: number
}

function toMetrics(
  sprints: { budget: number; actualCost: number; pointsDelivered: number }[],
): SprintWithMetrics[] {
  return sprints.map(s => ({
    ...s,
    _id: (s as { _id?: string })._id ?? String(Math.random()),
    name: (s as { name?: string }).name ?? '',
    status: ((s as { status?: string }).status ?? 'closed') as 'planned' | 'active' | 'closed',
    startDate: (s as { startDate?: number }).startDate ?? Date.now(),
    endDate: (s as { endDate?: number }).endDate ?? Date.now(),
    pointsEstimated: (s as { pointsEstimated?: number }).pointsEstimated ?? 0,
    taskCount: (s as { taskCount?: number }).taskCount ?? 0,
    completedCount: (s as { completedCount?: number }).completedCount ?? 0,
    velocity: (s as { velocity?: number }).velocity ?? 0,
    costPerPoint: calcCostPerPoint(s),
    budgetAccuracy: calcBudgetAccuracy(s),
  })) as SprintWithMetrics[]
}

interface StatCardProps {
  label: string
  value: string
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div
      className="border-2 border-border bg-card p-4"
      data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  )
}

interface BudgetChartProps {
  sprints: SprintWithMetrics[]
}

function BudgetUtilizationChart({ sprints }: BudgetChartProps) {
  return (
    <div className="space-y-4">
      <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
        Budget Utilization
      </div>
      <div className="space-y-3">
        {sprints.map(sprint => (
          <div key={sprint._id} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium">{sprint.name}</span>
              <span className="text-muted-foreground">
                Est: {sprint.budget.toFixed(2)} | Actual: {sprint.actualCost.toFixed(2)}
              </span>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${Math.min((sprint.actualCost / sprint.budget) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs font-medium">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-secondary" />
          Estimated
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-primary" />
          Actual
        </span>
      </div>
    </div>
  )
}

function formatCostPerPoint(cost: number): string {
  return cost === 0 ? '-' : cost.toFixed(2)
}

function formatBudgetAccuracy(acc: number): string {
  return acc.toFixed(0) + '%'
}

export function AnalyticsPage() {
  const sprints = useSprintHistory()

  if (sprints === undefined) {
    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Sprint velocity, cost efficiency, and delivery metrics
          </p>
        </div>
        <div className="py-12 text-center text-muted-foreground">Loading analytics...</div>
      </section>
    )
  }

  if (sprints.length === 0) {
    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Sprint velocity, cost efficiency, and delivery metrics
          </p>
        </div>
        <div className="py-12 text-center text-muted-foreground">No sprint history</div>
      </section>
    )
  }

  const metrics = toMetrics(sprints)
  const avgCostPerPoint = calcAvgCostPerPoint(sprints)
  const pointsPerDollar = calcPointsPerDollar(sprints)
  const avgVelocity = calcAvgVelocity(sprints)
  const avgBudgetAccuracy = calcAvgBudgetAccuracy(sprints)

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Sprint velocity, cost efficiency, and delivery metrics
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Avg Cost/Point" value={formatCostPerPoint(avgCostPerPoint)} />
        <StatCard label="Points per Dollar" value={pointsPerDollar.toFixed(2)} />
        <StatCard label="Sprint Velocity" value={avgVelocity.toFixed(1)} />
        <StatCard label="Budget Accuracy" value={formatBudgetAccuracy(avgBudgetAccuracy)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-2 border-border bg-card">
          <CardHeader className="border-b-2 border-border bg-muted/30 pb-3">
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Points delivered</span>
              <span>Cost per point</span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <VelocityTrendChart sprints={sprints} />
          </CardContent>
        </Card>

        <Card className="border-2 border-border bg-card">
          <CardHeader className="border-b-2 border-border bg-muted/30 pb-3">
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Estimated</span>
              <span>Actual</span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <BudgetUtilizationChart sprints={metrics} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-border bg-card">
        <CardHeader className="border-b-2 border-border bg-muted/30">
          <div className="text-sm font-bold uppercase tracking-wider">Sprint History</div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-border bg-muted/30">
                <th className="p-4 text-left text-xs font-black uppercase tracking-wider">
                  Sprint
                </th>
                <th className="p-4 text-left text-xs font-black uppercase tracking-wider">
                  Points
                </th>
                <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Tasks</th>
                <th className="p-4 text-left text-xs font-black uppercase tracking-wider">
                  Budget
                </th>
                <th className="p-4 text-left text-xs font-black uppercase tracking-wider">
                  Actual Cost
                </th>
                <th className="p-4 text-left text-xs font-black uppercase tracking-wider">
                  Cost/Point
                </th>
                <th className="p-4 text-left text-xs font-black uppercase tracking-wider">
                  Accuracy
                </th>
              </tr>
            </thead>
            <tbody>
              {metrics.map(sprint => (
                <tr
                  key={sprint._id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="p-4 font-medium">{sprint.name}</td>
                  <td className="p-4 tabular-nums">{sprint.pointsDelivered}</td>
                  <td className="p-4 tabular-nums">
                    {sprint.completedCount}/{sprint.taskCount}
                  </td>
                  <td className="p-4 tabular-nums">{sprint.budget.toFixed(2)}</td>
                  <td className="p-4 tabular-nums">{sprint.actualCost.toFixed(2)}</td>
                  <td className="p-4 tabular-nums">{formatCostPerPoint(sprint.costPerPoint)}</td>
                  <td className="p-4 tabular-nums">
                    {formatBudgetAccuracy(sprint.budgetAccuracy)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  )
}
