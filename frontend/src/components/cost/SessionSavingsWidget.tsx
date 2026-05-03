import { useEffect, useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAnalyticsFilters } from '@/lib/AnalyticsFiltersContext'

interface SessionSavings {
  totalSavedUSD: number
  totalResumedSessions: number
  avgSavingsPerSession: number
}

export function SessionSavingsWidget() {
  const { filters } = useAnalyticsFilters()
  const { days, projectSlug, autoRefresh, refreshInterval } = filters
  const [data, setData] = useState<SessionSavings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(() => {
    const params = new URLSearchParams({ days: String(days) })
    if (projectSlug) params.set('projectSlug', projectSlug)

    fetch(`/api/costs/session-savings?${params}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then(setData)
      .catch(err => setError(err.message))
  }, [days, projectSlug])

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
        <CardTitle className="text-lg font-semibold">Session Savings</CardTitle>
        <CardDescription>Cost avoided by session resumption</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-4xl font-bold text-green-500">${data.totalSavedUSD.toFixed(4)}</div>
          <div className="text-sm text-muted-foreground">Total Saved</div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-semibold">{data.totalResumedSessions}</div>
            <div className="text-xs text-muted-foreground">Resumed Sessions</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">${data.avgSavingsPerSession.toFixed(4)}</div>
            <div className="text-xs text-muted-foreground">Avg per Session</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
