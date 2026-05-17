import { useDashboardSprint } from '@/hooks/useDashboardData'
import { useDashboardAgents } from '@/hooks/useDashboardData'
import { useDashboardActivity } from '@/hooks/useDashboardData'
import { useDashboardAlerts } from '@/hooks/useDashboardData'
import { useDashboardMetrics } from '@/hooks/useDashboardData'
import { SprintStatus } from './SprintStatus'
import { KeyMetrics } from './KeyMetrics'
import { AgentStatus } from './AgentStatus'
import { AttentionNeeded } from './AttentionNeeded'
import { RecentActivity } from './RecentActivity'

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4" data-testid="dashboard-skeleton">
      <div className="h-32 bg-muted rounded" />
      <div className="h-24 bg-muted rounded" />
    </div>
  )
}

export function DashboardDataIntegration() {
  const sprint = useDashboardSprint()
  const agents = useDashboardAgents()
  const activity = useDashboardActivity()
  const alerts = useDashboardAlerts()
  const metrics = useDashboardMetrics()

  if (!sprint && !agents && !activity && !alerts && !metrics) {
    return <Skeleton />
  }

  return (
    <div className="space-y-4">
      {sprint && <SprintStatus sprint={sprint} />}
      {metrics && <KeyMetrics metrics={metrics} />}
      {agents && <AgentStatus agents={agents} />}
      {alerts && <AttentionNeeded alerts={alerts} />}
      {activity && <RecentActivity activities={activity} />}
    </div>
  )
}
