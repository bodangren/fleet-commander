import { useEffect, useState } from 'react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
    <div className="grid gap-3 md:grid-cols-5">
      {items.map(item => (
        <Card key={item.label} className="border-border/60 bg-card/80 backdrop-blur">
          <CardHeader className="space-y-1 p-4">
            <CardDescription className="text-xs">{item.label}</CardDescription>
            <CardTitle className="text-2xl">{item.value}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
