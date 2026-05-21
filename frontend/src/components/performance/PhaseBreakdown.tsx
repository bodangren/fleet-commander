import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAnalyticsFilters } from '@/lib/AnalyticsFiltersContext'
import { usePhaseBreakdown } from '@/lib/useConvexRealtime'

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
  const { days, projectSlug, agent } = filters
  const data = usePhaseBreakdown({ days, projectSlug, agent })

  if (data === undefined) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  const breakdown = data as BreakdownData

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
                const stats = breakdown[key]
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
