import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface IssueStats {
  openCount: number
  resolvedCount: number
  avgResolutionHours: number
}

export function IssueResolution() {
  const [stats, setStats] = useState<IssueStats | null>(null)

  useEffect(() => {
    fetch('/api/stats/issues')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  if (!stats) return null

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Issue Resolution</CardTitle>
        <CardDescription>Issue tracking metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{stats.openCount}</div>
            <div className="text-xs text-muted-foreground">Open</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.resolvedCount}</div>
            <div className="text-xs text-muted-foreground">Resolved</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {stats.avgResolutionHours > 0
                ? `${stats.avgResolutionHours.toFixed(1)}h`
                : '-'}
            </div>
            <div className="text-xs text-muted-foreground">Avg Resolution</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
