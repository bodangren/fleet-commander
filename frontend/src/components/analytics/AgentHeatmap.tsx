import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AgentHeatmapProps {
  days?: number
  projectSlug?: string
}

interface UtilizationData {
  agent: string
  date: string
  activeTasks: number
  completedTasks: number
}

export function AgentHeatmap({ days = 30, projectSlug }: AgentHeatmapProps) {
  const [data, setData] = useState<UtilizationData[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams({ days: String(days) })
    if (projectSlug) params.set('projectSlug', projectSlug)

    fetch(`/api/analytics/agent-utilization?${params}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then(setData)
      .catch(err => setError(err.message))
  }, [days, projectSlug])

  if (error) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="py-8 text-center text-muted-foreground">{error}</CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  const agents = [...new Set(data.map(d => d.agent))]
  const dates = [...new Set(data.map(d => d.date))].sort()

  const getValue = (agent: string, date: string) => {
    const entry = data.find(d => d.agent === agent && d.date === date)
    return entry ? entry.activeTasks + entry.completedTasks : 0
  }

  const maxValue = Math.max(...data.map(d => d.activeTasks + d.completedTasks), 1)

  const getIntensity = (value: number) => {
    const ratio = value / maxValue
    if (ratio === 0) return 'bg-muted/20'
    if (ratio < 0.25) return 'bg-primary/20'
    if (ratio < 0.5) return 'bg-primary/40'
    if (ratio < 0.75) return 'bg-primary/60'
    return 'bg-primary/80'
  }

  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Agent Utilization</CardTitle>
        <CardDescription>Task activity by agent over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left text-muted-foreground">Agent</th>
                {dates.slice(-14).map(date => (
                  <th key={date} className="p-2 text-center text-xs text-muted-foreground">
                    {date.slice(5)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => (
                <tr key={agent}>
                  <td className="p-2 font-medium">{agent}</td>
                  {dates.slice(-14).map(date => {
                    const value = getValue(agent, date)
                    return (
                      <td key={date} className="p-1">
                        <div
                          className={`h-8 w-full rounded ${getIntensity(value)}`}
                          title={`${agent} on ${date}: ${value} tasks`}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
