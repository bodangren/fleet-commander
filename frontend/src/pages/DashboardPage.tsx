import { SprintStatus } from '@/components/dashboard/SprintStatus'
import { KeyMetrics } from '@/components/dashboard/KeyMetrics'
import { AgentStatus } from '@/components/dashboard/AgentStatus'
import { AttentionNeeded } from '@/components/dashboard/AttentionNeeded'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { AtRiskBanner } from '@/components/dashboard/AtRiskBanner'
import { BurnForecastCard } from '@/components/dashboard/BurnForecastCard'
import { useDashboardData } from '@/hooks/useDashboardData'

const COLORS = {
  textMuted: '#8a8f98',
}

/**
 * Main dashboard showing sprint status, key metrics, agent workload, and recent activity.
 */
export function DashboardPage() {
  const { data, loading, error, refresh } = useDashboardData()

  if (loading) {
    return <div style={{ padding: 48, color: COLORS.textMuted }}>Loading dashboard...</div>
  }

  if (error || !data) {
    return (
      <div style={{ padding: 48, color: COLORS.textMuted }}>
        <h1>Dashboard unavailable</h1>
        <p>{error ?? 'No dashboard data was returned.'}</p>
        <button type="button" onClick={refresh}>
          Retry
        </button>
      </div>
    )
  }

  const { sprint, tasks, agents, pipelineRuns, alerts, metrics } = data
  const blockedTasks = tasks.filter(t => t.status === 'blocked')

  const burnForecast = sprint
    ? {
        burnRatePerHour: sprint.burnRate,
        projectedExhaustionMs: sprint.projectedExhaustionMs,
        remainingBudget: sprint.budget - sprint.actualCost,
        confidence: sprint.forecastConfidence,
        dataPoints: sprint.completedCount,
        atRisk: sprint.atRisk,
        sprintBudget: sprint.budget,
        currentSpend: sprint.actualCost,
      }
    : null

  return (
    <div
      data-realtime-ready="true"
      style={{ padding: '32px 48px', maxWidth: 1200, margin: '0 auto' }}
    >
      <SprintStatus sprint={sprint} />

      {burnForecast && (
        <AtRiskBanner
          atRisk={burnForecast.atRisk}
          confidence={burnForecast.confidence}
          projectedExhaustionMs={burnForecast.projectedExhaustionMs}
          remainingBudget={burnForecast.remainingBudget}
        />
      )}

      <div
        data-testid="dashboard-grid"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}
        className="md:grid-cols-2"
      >
        <KeyMetrics metrics={metrics} />
        {burnForecast ? (
          <BurnForecastCard forecast={burnForecast} />
        ) : (
          <AgentStatus agents={agents} tasks={tasks} />
        )}
      </div>

      <div
        data-testid="dashboard-grid"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}
        className="md:grid-cols-2"
      >
        <AttentionNeeded alerts={alerts} blockedTasks={blockedTasks} sprint={sprint} />
        <RecentActivity pipelineRuns={pipelineRuns} tasks={tasks} agents={agents} />
      </div>
    </div>
  )
}
