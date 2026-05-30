import { formatDuration } from '@/lib/formatDuration'

export interface AgentPerformanceBreakdownProps {
  agents: Array<{
    agent: string
    tasksAssigned: number
    tasksCompleted: number
    tasksRejected: number
    tasksBlocked: number
    avgDurationMs: number
  }>
}

export function AgentPerformanceBreakdown({ agents }: AgentPerformanceBreakdownProps) {
  if (agents.length === 0) {
    return <div className="py-8 text-center text-muted-foreground text-sm">No agent data</div>
  }

  const maxAssigned = Math.max(...agents.map(a => a.tasksAssigned), 1)

  return (
    <div className="space-y-4">
      <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
        Agent Performance
      </span>
      <div className="border-2 border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-border bg-muted/30">
              <th className="p-3 text-left text-xs font-black uppercase tracking-wider">Agent</th>
              <th className="p-3 text-left text-xs font-black uppercase tracking-wider">Tasks</th>
              <th className="p-3 text-left text-xs font-black uppercase tracking-wider">
                Completion
              </th>
              <th className="p-3 text-left text-xs font-black uppercase tracking-wider">
                Avg Duration
              </th>
            </tr>
          </thead>
          <tbody>
            {agents.map(agent => {
              const rate =
                agent.tasksAssigned > 0 ? (agent.tasksCompleted / agent.tasksAssigned) * 100 : 0
              return (
                <tr
                  key={agent.agent}
                  className="border-b border-border last:border-0"
                  data-testid={`agent-row-${agent.agent}`}
                >
                  <td className="p-3 font-medium">{agent.agent}</td>
                  <td className="p-3 tabular-nums">
                    {agent.tasksCompleted}/{agent.tasksAssigned}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-500' : 'bg-destructive'}`}
                          style={{ width: `${Math.min(rate, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums w-10 text-right">
                        {rate.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="p-3 tabular-nums text-sm">
                    {formatDuration(agent.avgDurationMs)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
