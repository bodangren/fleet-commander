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
    <Card className="border-4 border-border bg-card shadow-[4px_4px_0px_0px_theme(colors.secondary.DEFAULT)]">
      <CardHeader className="p-6 border-b-2 border-border bg-muted/20">
        <h3 className="text-xl font-black italic tracking-tighter uppercase leading-none">AGENT_LOAD</h3>
        <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1">Execution distribution</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {agents.map(agent => (
            <div key={agent.agentName} className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-primary italic">@ {agent.agentName}</span>
                <span className="text-muted-foreground">
                  {agent.totalExecutions} RUNS // {Math.round(agent.utilization)}%
                </span>
              </div>
              <div className="h-4 border-2 border-border bg-muted/50 p-0.5">
                <div
                  className="h-full bg-primary transition-all shadow-[2px_2px_0px_0px_theme(colors.secondary.DEFAULT)]"
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
