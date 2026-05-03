import { CostTrendChart } from '@/components/cost/CostTrendChart'
import { CostByProjectChart } from '@/components/cost/CostByProjectChart'
import { CostByAgentChart } from '@/components/cost/CostByAgentChart'
import { SessionSavingsWidget } from '@/components/cost/SessionSavingsWidget'
import { BudgetGauge } from '@/components/cost/BudgetGauge'
import { AnalyticsFilterBar } from '@/components/analytics/AnalyticsFilterBar'
import { AnalyticsFiltersProvider } from '@/lib/AnalyticsFiltersContext'

export function CostDashboard() {
  return (
    <AnalyticsFiltersProvider>
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cost Tracking</h1>
            <p className="text-muted-foreground">
              LLM API costs, budget utilization, and session savings
            </p>
          </div>
        </div>

        <AnalyticsFilterBar />

        <div className="grid gap-6 lg:grid-cols-2">
          <CostTrendChart />
          <CostByProjectChart />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <CostByAgentChart />
          <SessionSavingsWidget />
          <BudgetGauge />
        </div>
      </section>
    </AnalyticsFiltersProvider>
  )
}
