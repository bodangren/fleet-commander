import { useEffect, useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAnalyticsFilters } from '@/lib/AnalyticsFiltersContext'

interface PerTaskData {
  totalCostUSD: number
  completedTasks: number
  costPerTask: number
}

export function BudgetGauge() {
  const { filters } = useAnalyticsFilters()
  const { days, projectSlug, autoRefresh, refreshInterval } = filters
  const [data, setData] = useState<PerTaskData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(() => {
    const params = new URLSearchParams({ days: String(days) })
    if (projectSlug) params.set('projectSlug', projectSlug)

    fetch(`/api/costs/per-task?${params}`)
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
        <CardTitle className="text-lg font-semibold">Cost per Task</CardTitle>
        <CardDescription>Average LLM cost per completed task</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-4xl font-bold">${data.costPerTask.toFixed(4)}</div>
          <div className="text-sm text-muted-foreground">Per Task</div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-semibold">${data.totalCostUSD.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Total Cost</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">{data.completedTasks}</div>
            <div className="text-xs text-muted-foreground">Completed Tasks</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
