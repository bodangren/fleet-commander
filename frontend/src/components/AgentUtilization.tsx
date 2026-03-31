import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AgentStat {
  agentName: string
  totalExecutions: number
  totalDurationMs: number
  successCount: number
  utilization: number
}

export function AgentUtilization() {
  const [agents, setAgents] = useState<AgentStat[]>([])

  useEffect(() => {
    fetch('/api/stats/agents')
      .then(r => r.json())
      .then(data => setAgents(data.agents ?? []))
      .catch(() => {})
  }, [])

  if (agents.length === 0) return null

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Agent Utilization</CardTitle>
        <CardDescription>Execution time distribution across agents</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {agents.map(agent => (
            <div key={agent.agentName} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono">{agent.agentName}</span>
                <span className="text-muted-foreground">
                  {agent.totalExecutions} runs &middot; {Math.round(agent.utilization)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(agent.utilization, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
