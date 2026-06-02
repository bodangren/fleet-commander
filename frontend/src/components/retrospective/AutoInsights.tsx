import { formatDuration } from '@/lib/formatDuration'

export interface AutoInsightsProps {
  data: {
    taskCounts: { planned: number; completed: number; blocked: number; failed: number }
    agentWorkload: Array<{
      agent: string
      tasksAssigned: number
      tasksCompleted: number
      tasksRejected?: number
      tasksBlocked?: number
      avgDurationMs: number
    }>
    velocity: { completionRate: number }
    costPerPoint: number
    rejectionReasons: Array<{ reason: string; count: number }>
  }
}

export function generateInsights(data: AutoInsightsProps['data']): string[] {
  const insights: string[] = []

  if (data.velocity.completionRate >= 0.9) {
    insights.push(
      `Excellent velocity: ${(data.velocity.completionRate * 100).toFixed(0)}% completion rate.`,
    )
  } else if (data.velocity.completionRate < 0.5) {
    insights.push(
      `Low velocity: only ${(data.velocity.completionRate * 100).toFixed(0)}% of tasks completed.`,
    )
  }

  if (data.taskCounts.blocked > 0) {
    insights.push(
      `${data.taskCounts.blocked} task${data.taskCounts.blocked > 1 ? 's' : ''} blocked — review dependency chains.`,
    )
  }

  if (data.taskCounts.failed > 0) {
    insights.push(
      `${data.taskCounts.failed} task${data.taskCounts.failed > 1 ? 's' : ''} failed — check error logs for root cause.`,
    )
  }

  const topReject = data.rejectionReasons[0]
  if (topReject && topReject.count >= 2) {
    insights.push(`Top rejection reason (${topReject.count}x): "${topReject.reason}"`)
  }

  const agents = data.agentWorkload.filter(a => a.tasksAssigned > 0)
  if (agents.length > 1) {
    const sorted = [...agents].sort((a, b) => b.tasksAssigned - a.tasksAssigned)
    const top = sorted[0]
    const bottom = sorted[sorted.length - 1]
    if (top.tasksAssigned >= bottom.tasksAssigned * 3) {
      insights.push(
        `Workload imbalance: ${top.agent} has ${top.tasksAssigned} tasks vs ${bottom.agent}'s ${bottom.tasksAssigned}.`,
      )
    }
  }

  const slowAgents = agents.filter(a => a.avgDurationMs > 0)
  const avgAll =
    slowAgents.length > 0
      ? slowAgents.reduce((s, a) => s + a.avgDurationMs, 0) / slowAgents.length
      : 0
  if (slowAgents.length > 1) {
    const slowest = slowAgents.find(a => a.avgDurationMs > avgAll * 2)
    if (slowest) {
      insights.push(
        `${slowest.agent} averaging ${formatDuration(slowest.avgDurationMs)} per task — consider reviewing prompt or model.`,
      )
    }
  }

  // Cross-dimensional: agent × rejection correlation
  const agentsWithRejections = agents.filter(
    a => a.tasksAssigned > 0 && a.tasksAssigned > a.tasksCompleted,
  )
  if (agentsWithRejections.length > 0) {
    const withRate = agentsWithRejections.map(a => ({
      agent: a.agent,
      rate: (a.tasksAssigned - a.tasksCompleted) / a.tasksAssigned,
    }))
    const avgRate = withRate.reduce((s, a) => s + a.rate, 0) / withRate.length
    const highReject = withRate.find(a => a.rate > avgRate * 2 && a.rate > 0.3)
    if (highReject) {
      insights.push(
        `${highReject.agent} has a ${Math.round(highReject.rate * 100)}% rejection rate — investigate task fit or prompt quality.`,
      )
    }
  }

  // Cross-dimensional: agent × task duration correlation
  if (slowAgents.length > 1 && agents.length > 1) {
    const fastAgents = agents.filter(a => a.avgDurationMs > 0 && a.avgDurationMs < avgAll * 0.5)
    if (fastAgents.length > 0 && slowAgents.length > 0) {
      const fastest = fastAgents[0]
      const slowestAgent = slowAgents[slowAgents.length - 1]
      if (slowestAgent.avgDurationMs > fastest.avgDurationMs * 3) {
        insights.push(
          `${slowestAgent.agent} is ${Math.round(slowestAgent.avgDurationMs / fastest.avgDurationMs)}x slower than ${fastest.agent} — consider different model or prompt tuning.`,
        )
      }
    }
  }

  if (data.costPerPoint > 0) {
    insights.push(`Cost efficiency: $${data.costPerPoint.toFixed(2)} per story point.`)
  }

  if (insights.length === 0) {
    insights.push('No significant patterns detected in this sprint.')
  }

  return insights
}

export function AutoInsights({ data }: AutoInsightsProps) {
  const insights = generateInsights(data)

  return (
    <div className="space-y-3">
      <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
        Auto Insights
      </span>
      <ul className="space-y-2" data-testid="auto-insights">
        {insights.map((insight, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="mt-1 block w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            <span>{insight}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
