import type { AgentHistoryItem } from '@/__fixtures__/historyFixtures'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface AgentDetailViewProps {
  agent: AgentHistoryItem | null
  onBack?: () => void
}

export function AgentDetailView({ agent, onBack }: AgentDetailViewProps) {
  if (!agent) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Select an agent to view details
      </div>
    )
  }

  return (
    <Card className="border-4 border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between border-b-2 border-border bg-muted/30 p-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="outline" size="icon" onClick={onBack} aria-label="Back">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Button>
          )}
          <CardTitle className="text-2xl font-black italic tracking-tighter uppercase">
            {agent.displayName}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Model
            </span>
            <p className="text-2xl font-black">{agent.model}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Tasks Completed
            </span>
            <p className="text-2xl font-black tabular-nums">{agent.tasksCompleted}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Total Cost
            </span>
            <p className="text-2xl font-black tabular-nums">${agent.totalCost.toFixed(2)}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Avg Latency (ms)
            </span>
            <p className="text-2xl font-black tabular-nums">{agent.avgLatencyMs}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Reliability
            </span>
            <p className="text-2xl font-black tabular-nums">{agent.reliability.toFixed(2)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
