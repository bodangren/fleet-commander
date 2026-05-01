import { useEffect, useState } from 'react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Stats {
  totalProjects: number
  totalTasks: number
  completedTasks: number
  activeAgents: number
  openIssues: number
}

export function OverviewStats() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/stats/overview')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  if (!stats) return null

  const completionRate =
    stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0

  const items = [
    { label: 'Projects', value: stats.totalProjects },
    { label: 'Total Tasks', value: stats.totalTasks },
    { label: 'Completion Rate', value: `${completionRate}%` },
    { label: 'Active Agents', value: stats.activeAgents },
    { label: 'Open Issues', value: stats.openIssues },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {items.map((item, idx) => (
        <Card
          key={item.label}
          className={cn(
            'border-4 border-border bg-card',
            idx % 2 === 0
              ? 'shadow-[4px_4px_0px_0px_hsl(var(--primary))]'
              : 'shadow-[4px_4px_0px_0px_hsl(var(--secondary))]',
          )}
        >
          <CardHeader className="space-y-2 p-6">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              {item.label}
            </CardDescription>
            <CardTitle className="text-4xl font-black italic tracking-tighter leading-none">
              {item.value}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
