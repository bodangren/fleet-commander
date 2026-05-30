import { SprintStatus } from '@/components/dashboard/SprintStatus'
import { KeyMetrics } from '@/components/dashboard/KeyMetrics'
import { AgentStatus } from '@/components/dashboard/AgentStatus'
import { AttentionNeeded } from '@/components/dashboard/AttentionNeeded'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { useDashboardData } from '@/hooks/useDashboardData'

const COLORS = {
  textMuted: '#8a8f98',
}

/**
 * Renders a page component
 */
export function DashboardPage() {
  const data = useDashboardData()

  if (data === undefined) {
    return <div style={{ padding: 48, color: COLORS.textMuted }}>Loading dashboard...</div>
  }

  const { sprint, tasks, agents, pipelineRuns, alerts, metrics } = data
  const blockedTasks = tasks.filter(t => t.status === 'blocked')

  return (
    <div style={{ padding: '32px 48px', maxWidth: 1200, margin: '0 auto' }}>
      <SprintStatus sprint={sprint} />

      <div
        data-testid="dashboard-grid"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}
        className="md:grid-cols-2"
      >
        <KeyMetrics metrics={metrics} />
        <AgentStatus agents={agents} tasks={tasks} />
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
