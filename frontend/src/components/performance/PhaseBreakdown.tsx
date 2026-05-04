import { useEffect, useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAnalyticsFilters } from '@/lib/AnalyticsFiltersContext'

interface PhaseStats {
  p50: number
  p95: number
  p99: number
}

interface BreakdownData {
  load: PhaseStats
  score: PhaseStats
  execute: PhaseStats
  persist: PhaseStats
  hookBefore: PhaseStats
  hookAfter: PhaseStats
  total: PhaseStats
}

const PHASES: { key: keyof BreakdownData; label: string }[] = [
  { key: 'load', label: 'Load' },
  { key: 'score', label: 'Score' },
  { key: 'execute', label: 'Execute' },
  { key: 'persist', label: 'Persist' },
  { key: 'hookBefore', label: 'Hook Before' },
  { key: 'hookAfter', label: 'Hook After' },
  { key: 'total', label: 'Total' },
]

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

export function PhaseBreakdown() {
  const { filters } = useAnalyticsFilters()
  const { days, projectSlug, agent, autoRefresh, refreshInterval } = filters
  const [data, setData] = useState<BreakdownData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(() => {
    const params = new URLSearchParams({ days: String(days) })
    if (projectSlug) params.set('projectSlug', projectSlug)
    if (agent) params.set('agent', agent)

    fetch(`/api/performance/phase-breakdown?${params}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then(setData)
      .catch(err => setError(err.message))
  }, [days, projectSlug, agent])

  useEffect(() => {
    setError(null)
    setData(null)
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

  if (error) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="py-8 text-center text-muted-foreground">{error}</CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Phase Breakdown</CardTitle>
        <CardDescription>Latency percentiles by pipeline phase</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Phase</th>
                <th className="py-2 text-right font-medium">p50</th>
                <th className="py-2 text-right font-medium">p95</th>
                <th className="py-2 text-right font-medium">p99</th>
              </tr>
            </thead>
            <tbody>
              {PHASES.map(({ key, label }) => {
                const stats = data[key]
                return (
                  <tr key={key} className="border-b last:border-0">
                    <td className="py-2 font-medium">{label}</td>
                    <td className="py-2 text-right tabular-nums">{formatMs(stats.p50)}</td>
                    <td className="py-2 text-right tabular-nums">{formatMs(stats.p95)}</td>
                    <td className="py-2 text-right tabular-nums">{formatMs(stats.p99)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
