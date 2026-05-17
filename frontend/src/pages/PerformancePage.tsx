import { usePerformanceData } from '@/hooks/usePerformanceData'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%'
  return (value * 100).toFixed(0) + '%'
}

function formatCost(value: number): string {
  if (!Number.isFinite(value)) return '-'
  return '$' + value.toFixed(2)
}

function formatTrend(trend: 'improving' | 'stable' | 'declining'): string {
  return trend.charAt(0).toUpperCase() + trend.slice(1)
}

function AgentReliabilityTable({
  agents,
}: {
  agents: Array<{
    displayName: string
    model: string
    tasksCompleted: number
    totalCost: number
    reliability: number
    rejectionRate: number
    trend: 'improving' | 'stable' | 'declining'
  }>
}) {
  return (
    <Card className="border-2 border-border bg-card">
      <CardHeader className="border-b-2 border-border bg-muted/30 pb-3">
        <div className="text-sm font-bold uppercase tracking-wider">Agent Reliability</div>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-border bg-muted/30">
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Name</th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Model</th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Tasks</th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Cost</th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">
                Reliability
              </th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">
                Rejection Rate
              </th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Trend</th>
            </tr>
          </thead>
          <tbody>
            {agents.map(agent => (
              <tr
                key={agent.displayName}
                className="border-b border-border hover:bg-muted/50 transition-colors"
              >
                <td className="p-4 font-medium">{agent.displayName}</td>
                <td className="p-4 text-muted-foreground">{agent.model}</td>
                <td className="p-4 tabular-nums">{agent.tasksCompleted}</td>
                <td className="p-4 tabular-nums">{formatCost(agent.totalCost)}</td>
                <td className="p-4 tabular-nums">{formatPercent(agent.reliability)}</td>
                <td className="p-4 tabular-nums">{formatPercent(agent.rejectionRate)}</td>
                <td className="p-4">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      agent.trend === 'improving'
                        ? 'bg-green-100 text-green-800'
                        : agent.trend === 'declining'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {formatTrend(agent.trend)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function PipelineCostBreakdown({
  stages,
}: {
  stages: Array<{ stage: string; cost: number; percentage: number }>
}) {
  return (
    <Card className="border-2 border-border bg-card">
      <CardHeader className="border-b-2 border-border bg-muted/30 pb-3">
        <div className="text-sm font-bold uppercase tracking-wider">Pipeline Cost</div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {stages.map(stage => (
            <div key={stage.stage} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{stage.stage}</span>
                <span className="text-muted-foreground">
                  {formatCost(stage.cost)} ({stage.percentage.toFixed(0)}%)
                </span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(stage.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-4 text-xs font-medium">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-secondary" />
            Usage
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function RejectionReasonsAnalysis({
  reasons,
}: {
  reasons: Array<{ reason: string; count: number; percentage: number }>
}) {
  return (
    <Card className="border-2 border-border bg-card">
      <CardHeader className="border-b-2 border-border bg-muted/30 pb-3">
        <div className="text-sm font-bold uppercase tracking-wider">Rejection Reasons</div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {reasons.map((item) => (
            <div key={item.reason} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{item.reason}</span>
                <span className="text-muted-foreground">
                  {item.count} ({item.percentage.toFixed(0)}%)
                </span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-red-400 transition-all"
                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function PerformancePage() {
  const data = usePerformanceData()

  if (data === undefined) {
    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
          <p className="text-muted-foreground">
            Agent reliability, pipeline costs, and rejection tracking
          </p>
        </div>
        <div className="py-12 text-center text-muted-foreground">Loading performance...</div>
      </section>
    )
  }

  if (
    data.agents.length === 0 &&
    data.pipelineCosts.length === 0 &&
    data.rejectionReasons.length === 0
  ) {
    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
          <p className="text-muted-foreground">
            Agent reliability, pipeline costs, and rejection tracking
          </p>
        </div>
        <div className="py-12 text-center text-muted-foreground">No performance data</div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
        <p className="text-muted-foreground">
          Agent reliability, pipeline costs, and rejection tracking
        </p>
      </div>

      <AgentReliabilityTable agents={data.agents} />

      <div className="grid gap-6 lg:grid-cols-2">
        <PipelineCostBreakdown stages={data.pipelineCosts} />
        <RejectionReasonsAnalysis reasons={data.rejectionReasons} />
      </div>
    </section>
  )
}
