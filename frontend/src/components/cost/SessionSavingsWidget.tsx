import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAnalyticsFilters } from '@/lib/AnalyticsFiltersContext'
import { useSessionSavings } from '@/lib/useConvexRealtime'

interface SessionSavings {
  totalSavedUSD: number
  totalResumedSessions: number
  avgSavingsPerSession: number
}

/**
 * Renders a widget
 */
export function SessionSavingsWidget() {
  const { filters } = useAnalyticsFilters()
  const { days, projectSlug } = filters
  const data = useSessionSavings({ days, projectSlug })

  if (data === undefined) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  const savings = data as SessionSavings

  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Session Savings</CardTitle>
        <CardDescription>Cost avoided by session resumption</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-4xl font-bold text-green-500">
            ${savings.totalSavedUSD.toFixed(4)}
          </div>
          <div className="text-sm text-muted-foreground">Total Saved</div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-semibold">{savings.totalResumedSessions}</div>
            <div className="text-xs text-muted-foreground">Resumed Sessions</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">${savings.avgSavingsPerSession.toFixed(4)}</div>
            <div className="text-xs text-muted-foreground">Avg per Session</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
