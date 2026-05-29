import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BudgetBurndownChart } from './BudgetBurndownChart'
import { AgentPerformanceBreakdown } from './AgentPerformanceBreakdown'
import { RejectionReasonHistogram } from './RejectionReasonHistogram'
import { AutoInsights, generateInsights } from './AutoInsights'

export interface SprintRetrospectiveDashboardProps {
  sprintId: string
  sprintName: string
  budget: number
  actualCost: number
  aggregateData: {
    taskCounts: { planned: number; completed: number; blocked: number; failed: number; carriedOver: number }
    agentWorkload: Array<{
      agent: string
      tasksAssigned: number
      tasksCompleted: number
      avgDurationMs: number
    }>
    velocity: { planned: number; completed: number; completionRate: number }
  }
  costTrend: Array<{ sprintName: string; budget: number; actualCost: number; costPerPoint: number }>
  rejectionReasons: Array<{ reason: string; count: number }>
}

function buildMarkdown(
  sprintName: string,
  budget: number,
  actualCost: number,
  aggregateData: SprintRetrospectiveDashboardProps['aggregateData'],
  costTrend: SprintRetrospectiveDashboardProps['costTrend'],
  rejectionReasons: SprintRetrospectiveDashboardProps['rejectionReasons'],
): string {
  const lines: string[] = []
  lines.push(`# Retrospective: ${sprintName}`)
  lines.push('')
  lines.push('## Budget')
  lines.push(`- Budget: $${budget.toFixed(2)}`)
  lines.push(`- Actual Cost: $${actualCost.toFixed(2)}`)
  lines.push(
    `- Utilization: ${budget > 0 ? ((actualCost / budget) * 100).toFixed(1) : 0}%`,
  )
  lines.push('')

  lines.push('## Task Summary')
  lines.push(`- Planned: ${aggregateData.taskCounts.planned}`)
  lines.push(`- Completed: ${aggregateData.taskCounts.completed}`)
  lines.push(`- Blocked: ${aggregateData.taskCounts.blocked}`)
  lines.push(`- Failed: ${aggregateData.taskCounts.failed}`)
  lines.push(`- Carried Over: ${aggregateData.taskCounts.carriedOver}`)
  lines.push(
    `- Velocity: ${(aggregateData.velocity.completionRate * 100).toFixed(0)}%`,
  )
  lines.push('')

  if (aggregateData.agentWorkload.length > 0) {
    lines.push('## Agent Performance')
    lines.push('| Agent | Tasks | Completion | Avg Duration |')
    lines.push('|-------|-------|------------|--------------|')
    for (const a of aggregateData.agentWorkload) {
      const rate = a.tasksAssigned > 0 ? (a.tasksCompleted / a.tasksAssigned) * 100 : 0
      const dur =
        a.avgDurationMs < 1000
          ? `${a.avgDurationMs}ms`
          : a.avgDurationMs < 60000
            ? `${Math.floor(a.avgDurationMs / 1000)}s`
            : `${Math.floor(a.avgDurationMs / 60000)}m`
      lines.push(`| ${a.agent} | ${a.tasksCompleted}/${a.tasksAssigned} | ${rate.toFixed(0)}% | ${dur} |`)
    }
    lines.push('')
  }

  if (rejectionReasons.length > 0) {
    lines.push('## Rejection Reasons')
    for (const r of rejectionReasons) {
      lines.push(`- ${r.reason} (${r.count}x)`)
    }
    lines.push('')
  }

  if (costTrend.length > 1) {
    lines.push('## Cost Trend')
    lines.push('| Sprint | Budget | Actual | Cost/Point |')
    lines.push('|--------|--------|--------|------------|')
    for (const s of costTrend) {
      lines.push(
        `| ${s.sprintName} | $${s.budget.toFixed(2)} | $${s.actualCost.toFixed(2)} | $${s.costPerPoint.toFixed(2)} |`,
      )
    }
    lines.push('')
  }

  const insights = generateInsights({
    taskCounts: aggregateData.taskCounts,
    agentWorkload: aggregateData.agentWorkload,
    velocity: aggregateData.velocity,
    costPerPoint:
      costTrend.length > 0 ? costTrend[costTrend.length - 1].costPerPoint : 0,
    rejectionReasons,
  })
  if (insights.length > 0) {
    lines.push('## Insights')
    for (const insight of insights) {
      lines.push(`- ${insight}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

export function SprintRetrospectiveDashboard({
  sprintId: _sprintId,
  sprintName,
  budget,
  actualCost,
  aggregateData,
  costTrend,
  rejectionReasons,
}: SprintRetrospectiveDashboardProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = () => {
    setExporting(true)
    try {
      const md = buildMarkdown(sprintName, budget, actualCost, aggregateData, costTrend, rejectionReasons)
      const blob = new Blob([md], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `retrospective-${sprintName.toLowerCase().replace(/\s+/g, '-')}.md`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const costPerPoint =
    costTrend.length > 0 ? costTrend[costTrend.length - 1].costPerPoint : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Retrospective</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
          data-testid="export-markdown-btn"
        >
          {exporting ? 'Exporting…' : 'Export Markdown'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Task Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-black tabular-nums">{aggregateData.taskCounts.completed}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-black tabular-nums text-orange-500">
                  {aggregateData.taskCounts.blocked}
                </div>
                <div className="text-xs text-muted-foreground">Blocked</div>
              </div>
              <div>
                <div className="text-2xl font-black tabular-nums text-destructive">
                  {aggregateData.taskCounts.failed}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Velocity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tabular-nums">
              {(aggregateData.velocity.completionRate * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {aggregateData.velocity.completed} of {aggregateData.velocity.planned} tasks
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-border">
        <CardContent className="p-6">
          <BudgetBurndownChart budget={budget} actualCost={actualCost} costTrend={costTrend} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2 border-border">
          <CardContent className="p-6">
            <AgentPerformanceBreakdown agents={aggregateData.agentWorkload} />
          </CardContent>
        </Card>

        <Card className="border-2 border-border">
          <CardContent className="p-6">
            <RejectionReasonHistogram reasons={rejectionReasons} />
          </CardContent>
        </Card>
      </div>

      <AutoInsights
        data={{
          taskCounts: aggregateData.taskCounts,
          agentWorkload: aggregateData.agentWorkload,
          velocity: aggregateData.velocity,
          costPerPoint,
          rejectionReasons,
        }}
      />
    </div>
  )
}
