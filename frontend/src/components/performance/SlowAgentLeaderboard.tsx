import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAnalyticsFilters } from '@/lib/AnalyticsFiltersContext'
import { useSlowAgents } from '@/lib/useConvexRealtime'

interface SlowAgent {
  agent: string
  p95: number
  currentAvg: number
  threshold: number
  consecutiveBreaches: number
}

export function SlowAgentLeaderboard() {
  const { filters } = useAnalyticsFilters()
  const { days, projectSlug } = filters
  const data = useSlowAgents({ days, projectSlug })

  const isLoading = data === undefined
  const agents = (data as SlowAgent[] | undefined) ?? []

  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Slow Agent Leaderboard</CardTitle>
        <CardDescription>
          Agents exceeding p95 latency threshold for 3+ consecutive runs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : agents.length === 0 ? (
          <p className="text-muted-foreground">No slow agents detected.</p>
        ) : (
          <div className="space-y-3">
            {agents.map(agent => (
              <div
                key={agent.agent}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <p className="font-medium">{agent.agent}</p>
                  <p className="text-sm text-muted-foreground">
                    Avg: {agent.currentAvg}ms · Threshold: {agent.threshold}ms
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-destructive px-2.5 py-0.5 text-xs font-semibold text-destructive-foreground">
                    {agent.consecutiveBreaches} breaches
                  </span>
                  <span className="text-sm text-muted-foreground">p95: {agent.p95}ms</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
