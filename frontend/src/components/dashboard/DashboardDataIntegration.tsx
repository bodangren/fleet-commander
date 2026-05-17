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

function SectionSkeleton() {
  return (
    <div
      className="border-2 border-border bg-card p-6 animate-pulse"
      data-testid="section-skeleton"
    >
      <div className="space-y-3">
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="h-8 bg-muted rounded w-2/3" />
      </div>
    </div>
  )
}

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
      {sprint ? <SprintStatus sprint={sprint} /> : <SectionSkeleton />}
      {metrics ? <KeyMetrics metrics={metrics} /> : <SectionSkeleton />}
      {agents ? <AgentStatus agents={agents} /> : <SectionSkeleton />}
      {alerts ? <AttentionNeeded alerts={alerts} /> : <SectionSkeleton />}
      {activity ? <RecentActivity activities={activity} /> : <SectionSkeleton />}
    </div>
  )
}
