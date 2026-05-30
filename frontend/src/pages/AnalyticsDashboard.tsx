import { CompletionTrendChart } from '@/components/analytics/CompletionTrendChart'
import { AgentHeatmap } from '@/components/analytics/AgentHeatmap'
import { BottleneckChart } from '@/components/analytics/BottleneckChart'
import { QueueDepthChart } from '@/components/analytics/QueueDepthChart'
import { HookPerformanceChart } from '@/components/analytics/HookPerformanceChart'
import { SessionResumptionChart } from '@/components/analytics/SessionResumptionChart'
import { AnalyticsFilterBar } from '@/components/analytics/AnalyticsFilterBar'
import { AnalyticsFiltersProvider } from '@/lib/AnalyticsFiltersContext'

/**
 * Analytics dashboard component composing multiple analytics charts with filter bar
 */
export function AnalyticsDashboard() {
  return (
    <AnalyticsFiltersProvider>
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">
              Execution patterns, agent utilization, and system bottlenecks
            </p>
          </div>
        </div>

        <AnalyticsFilterBar />

        <div className="grid gap-6 lg:grid-cols-2">
          <CompletionTrendChart />
          <QueueDepthChart />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <BottleneckChart />
          <AgentHeatmap />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <HookPerformanceChart />
          <SessionResumptionChart />
        </div>
      </section>
    </AnalyticsFiltersProvider>
  )
}
