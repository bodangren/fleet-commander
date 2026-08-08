import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAnalyticsFilters } from '@/lib/AnalyticsFiltersContext'
import { useAgentUtilization } from '@/lib/useConvexRealtime'

/**
 * React component
 */
export function AgentHeatmap() {
  const { filters } = useAnalyticsFilters()
  const { days, projectSlug, agent } = filters
  const data = useAgentUtilization({ days, projectSlug, agent })

  if (data === undefined) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  const typedData = data as Array<{
    agent: string
    date: string
    activeTasks: number
    completedTasks: number
  }>
  const filteredData = agent ? typedData.filter(d => d.agent === agent) : typedData
  if (filteredData.length === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Agent Utilization</CardTitle>
          <CardDescription>Task activity by agent over time</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            No agent utilization data yet.
          </p>
        </CardContent>
      </Card>
    )
  }
  const agents = [...new Set(filteredData.map(d => d.agent))]
  const dates = [...new Set(filteredData.map(d => d.date))].sort()

  const getValue = (agentName: string, date: string) => {
    const entry = filteredData.find(d => d.agent === agentName && d.date === date)
    return entry ? entry.activeTasks + entry.completedTasks : 0
  }

  const maxValue = Math.max(...filteredData.map(d => d.activeTasks + d.completedTasks), 1)

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
              {agents.map(agentName => (
                <tr key={agentName}>
                  <td className="p-2 font-medium">{agentName}</td>
                  {dates.slice(-14).map(date => {
                    const value = getValue(agentName, date)
                    return (
                      <td key={date} className="p-1">
                        <div
                          className={`h-8 w-full rounded ${getIntensity(value)}`}
                          title={`${agentName} on ${date}: ${value} tasks`}
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
