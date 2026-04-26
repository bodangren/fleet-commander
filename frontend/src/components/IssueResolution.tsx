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
    <Card className="border-4 border-border bg-card shadow-[4px_4px_0px_0px_hsl(var(--accent))]">
      <CardHeader className="p-6 border-b-2 border-border bg-muted/20">
        <h3 className="text-xl font-black italic tracking-tighter uppercase leading-none">ISSUE_TRACKER</h3>
        <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1">Resolution metrics</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="border-2 border-border p-3 bg-muted/10">
            <div className="text-3xl font-black italic tracking-tighter text-destructive">{stats.openCount}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">OPEN</div>
          </div>
          <div className="border-2 border-border p-3 bg-muted/10">
            <div className="text-3xl font-black italic tracking-tighter text-primary">{stats.resolvedCount}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">DONE</div>
          </div>
          <div className="border-2 border-border p-3 bg-muted/10">
            <div className="text-3xl font-black italic tracking-tighter text-secondary">
              {stats.avgResolutionHours > 0 ? `${stats.avgResolutionHours.toFixed(0)}H` : '-'}
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">AVG_TIME</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
