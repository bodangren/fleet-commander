import { useEffect, useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAnalyticsFilters } from '@/lib/AnalyticsFiltersContext'

interface SlowAgent {
  agent: string
  p95: number
  currentAvg: number
  threshold: number
  consecutiveBreaches: number
}

export function SlowAgentLeaderboard() {
  const { filters } = useAnalyticsFilters()
  const { days, projectSlug, autoRefresh, refreshInterval } = filters
  const [data, setData] = useState<SlowAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({
      days: String(days),
      thresholdMultiplier: '1.5',
      minConsecutiveBreaches: '3',
    })
    if (projectSlug) params.set('projectSlug', projectSlug)

    fetch(`/api/performance/slow-agents?${params}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then(json => {
        setData(Array.isArray(json) ? json : [])
        setLoading(false)
        setError(null)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [days, projectSlug])

  useEffect(() => {
    setError(null)
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, refreshInterval)
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [autoRefresh, refreshInterval, fetchData])

  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Slow Agent Leaderboard</CardTitle>
        <CardDescription>
          Agents exceeding p95 latency threshold for 3+ consecutive runs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-muted-foreground">{error}</p>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : data.length === 0 ? (
          <p className="text-muted-foreground">No slow agents detected.</p>
        ) : (
          <div className="space-y-3">
            {data.map(agent => (
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
