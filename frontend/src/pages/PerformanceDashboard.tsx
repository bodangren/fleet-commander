import { SlowAgentLeaderboard } from '@/components/performance/SlowAgentLeaderboard'
import { PhaseBreakdown } from '@/components/performance/PhaseBreakdown'
import { PhaseTrends } from '@/components/performance/PhaseTrends'
import { AnalyticsFilterBar } from '@/components/analytics/AnalyticsFilterBar'
import { AnalyticsFiltersProvider } from '@/lib/AnalyticsFiltersContext'

/**
 * Renders a dashboard page
 */
export function PerformanceDashboard() {
  return (
    <AnalyticsFiltersProvider>
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
            <p className="text-muted-foreground">
              Execution timing, slow agent detection, and regression tracking
            </p>
          </div>
        </div>

        <AnalyticsFilterBar />

        <div className="grid gap-6 lg:grid-cols-2">
          <PhaseBreakdown />
          <PhaseTrends />
        </div>

        <SlowAgentLeaderboard />
      </section>
    </AnalyticsFiltersProvider>
  )
}
