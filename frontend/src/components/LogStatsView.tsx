import { useCallback, useEffect, useState } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { LogStats } from '@/lib/fleetTypes'

/**
 * Renders a view component displaying aggregated execution statistics
 * @param projectId - Project identifier
 */
export function LogStatsView({ projectId }: { projectId: string }) {
  const [stats, setStats] = useState<LogStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/logs/stats`)
      const payload = (await response.json()) as LogStats & { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to load stats')
      }
      setStats(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

  if (loading) {
    return (
      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle className="text-base">Execution Stats</CardTitle>
          <CardDescription>Loading statistics...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle className="text-base">Execution Stats</CardTitle>
          <CardDescription className="text-red-300">{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <Card className="border-border/60 bg-background/60">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-2">
          <CardTitle className="text-base">Execution Stats</CardTitle>
          <CardDescription>Aggregated performance metrics from execution logs.</CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void fetchStats()}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border/60 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Total Events
            </p>
            <p className="mt-2 text-2xl font-semibold">{stats.totalEntries}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Dispatches</p>
            <p className="mt-2 text-2xl font-semibold">{stats.dispatchCount}</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">Success Rate</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-100">
              {stats.successRate.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-amber-300">Avg Duration</p>
            <p className="mt-2 text-2xl font-semibold text-amber-100">
              {stats.avgDurationMs > 1000
                ? `${(stats.avgDurationMs / 1000).toFixed(1)}s`
                : `${Math.round(stats.avgDurationMs)}ms`}
            </p>
          </div>
        </div>

        {stats.errorCount > 0 ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4">
            <p className="text-sm text-rose-100">
              {stats.errorCount} error{stats.errorCount === 1 ? '' : 's'} recorded
            </p>
          </div>
        ) : null}

        {stats.agentBreakdown.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Per-Agent Breakdown
            </h3>
            <div className="space-y-2">
              {stats.agentBreakdown.map(agent => (
                <div
                  key={agent.agent}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-black/10 p-3"
                >
                  <span className="text-sm font-medium">{agent.agent}</span>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{agent.runs} runs</span>
                    {agent.avgMs > 0 ? <span>{Math.round(agent.avgMs)}ms avg</span> : null}
                    {agent.errors > 0 ? (
                      <span className="text-rose-300">{agent.errors} errors</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {stats.totalEntries === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">
            No execution data yet. Run the orchestrator to generate logs.
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
