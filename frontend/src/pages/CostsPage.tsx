import { useCostData } from '@/hooks/useCostData'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  formatCost,
  formatCostPerPoint,
  formatPointsPerDollar,
  formatReliability,
} from '@/lib/formatCost'

interface CostTrendChartProps {
  costTrend: Array<{
    sprintName: string
    costPerPoint: number
    pointsDelivered: number
    targetCostPerPoint: number
  }>
}

/**
 * Bar chart showing cost per point trend across sprint history
 * @param costTrend - Array of cost trend data points
 */
function CostTrendChart({ costTrend }: CostTrendChartProps) {
  if (costTrend.length === 0) {
    return <div className="py-12 text-center text-muted-foreground">No cost trend data</div>
  }

  const maxCost = Math.max(...costTrend.map(c => c.costPerPoint), 1)

  return (
    <div className="space-y-4">
      <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
        Cost per Point Trend
      </div>
      <div className="h-48 flex items-end gap-2">
        {costTrend.map(item => (
          <div key={item.sprintName} className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-full bg-primary transition-all"
              style={{
                height: `${Math.min((item.costPerPoint / maxCost) * 160, 160)}px`,
              }}
            />
            <span className="text-xs font-bold uppercase">{item.sprintName}</span>
            <span className="text-xs tabular-nums">{formatCostPerPoint(item.costPerPoint)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface AgentEfficiencyTableProps {
  agents: Array<{
    agentName: string
    model: string
    totalPoints: number
    totalCost: number
    costPerPoint: number
    reliability: number
    valueScore: 'High Value' | 'Standard' | 'Premium'
  }>
}

/**
 * Table displaying agent cost efficiency with model, cost/point, and reliability
 * @param agents - Array of agent efficiency data
 */
function AgentEfficiencyTable({ agents }: AgentEfficiencyTableProps) {
  return (
    <Card className="border-2 border-border bg-card">
      <CardHeader className="border-b-2 border-border bg-muted/30 pb-3">
        <div className="text-sm font-bold uppercase tracking-wider">Agent Cost Efficiency</div>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-border bg-muted/30">
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Name</th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Model</th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Points</th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">
                Total Cost
              </th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">
                Cost/Point
              </th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">
                Reliability
              </th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">
                Value Score
              </th>
            </tr>
          </thead>
          <tbody>
            {agents.map(agent => (
              <tr
                key={agent.agentName}
                className="border-b border-border hover:bg-muted/50 transition-colors"
              >
                <td className="p-4 font-medium">{agent.agentName}</td>
                <td className="p-4 text-muted-foreground">{agent.model}</td>
                <td className="p-4 tabular-nums">{agent.totalPoints}</td>
                <td className="p-4 tabular-nums">{formatCost(agent.totalCost)}</td>
                <td className="p-4 tabular-nums">{formatCostPerPoint(agent.costPerPoint)}</td>
                <td className="p-4 tabular-nums">{formatReliability(agent.reliability)}</td>
                <td className="p-4">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      agent.valueScore === 'High Value'
                        ? 'bg-green-100 text-green-800'
                        : agent.valueScore === 'Premium'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {agent.valueScore}
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

interface ROISummaryProps {
  roi: {
    avgCostPerPoint: number
    pointsPerDollar: number
    estimatedProjectCost: number
  }
}

/**
 * Card displaying ROI metrics (avg cost/point, points/dollar, est project cost)
 * @param roi - ROI metrics data
 */
function ROISummary({ roi }: ROISummaryProps) {
  return (
    <Card className="border-2 border-border bg-card">
      <CardHeader className="border-b-2 border-border bg-muted/30 pb-3">
        <div className="text-sm font-bold uppercase tracking-wider">ROI Summary</div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Avg Cost/Point
            </div>
            <div className="text-2xl font-bold">{formatCostPerPoint(roi.avgCostPerPoint)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Points per Dollar
            </div>
            <div className="text-2xl font-bold">{formatPointsPerDollar(roi.pointsPerDollar)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Est. Project Cost
            </div>
            <div className="text-2xl font-bold">{formatCost(roi.estimatedProjectCost)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface OptimizationListProps {
  optimizations: Array<{
    title: string
    description: string
    potentialSavings: number
    priority: 'high' | 'medium' | 'low'
  }>
}

/**
 * Card showing cost optimization opportunities ranked by priority and savings
 * @param optimizations - Array of optimization opportunities
 */
function OptimizationList({ optimizations }: OptimizationListProps) {
  return (
    <Card className="border-2 border-border bg-card">
      <CardHeader className="border-b-2 border-border bg-muted/30 pb-3">
        <div className="text-sm font-bold uppercase tracking-wider">Optimization Opportunities</div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {optimizations.map((opt, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{opt.title}</span>
                <span className="text-muted-foreground">
                  {formatCost(opt.potentialSavings)} savings
                </span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full transition-all ${
                    opt.priority === 'high'
                      ? 'bg-red-400'
                      : opt.priority === 'medium'
                        ? 'bg-yellow-400'
                        : 'bg-green-400'
                  }`}
                  style={{
                    width: `${opt.priority === 'high' ? 80 : opt.priority === 'medium' ? 50 : 30}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Cost insights page with trend charts, ROI summary, and optimization list
 */
export function CostsPage() {
  const data = useCostData()

  if (data === undefined) {
    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Costs</h1>
          <p className="text-muted-foreground">Cost insights and optimization</p>
        </div>
        <div className="py-12 text-center text-muted-foreground">Loading costs...</div>
      </section>
    )
  }

  if (
    data.costTrend.length === 0 &&
    data.agentEfficiency.length === 0 &&
    data.optimizations.length === 0
  ) {
    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Costs</h1>
          <p className="text-muted-foreground">Cost insights and optimization</p>
        </div>
        <div className="py-12 text-center text-muted-foreground">No cost data</div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Costs</h1>
        <p className="text-muted-foreground">Cost insights and optimization</p>
      </div>

      <Card className="border-2 border-border bg-card">
        <CardHeader className="border-b-2 border-border bg-muted/30 pb-3">
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Cost per point</span>
            <span>Target: $2.00</span>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <CostTrendChart costTrend={data.costTrend} />
        </CardContent>
      </Card>

      <AgentEfficiencyTable agents={data.agentEfficiency} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ROISummary roi={data.roiSummary} />
        <OptimizationList optimizations={data.optimizations} />
      </div>
    </section>
  )
}
