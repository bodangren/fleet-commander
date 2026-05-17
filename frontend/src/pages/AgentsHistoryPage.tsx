import { useState } from 'react'
import { useAgentHistory } from '@/hooks/useSprintHistory'
import { AgentPerformanceTable } from '@/components/history/AgentPerformanceTable'
import { AgentModelHistory } from '@/components/history/AgentModelHistory'
import { CostTrendChart } from '@/components/history/CostTrendChart'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { AgentHistoryItem } from '@/__fixtures__/historyFixtures'

export function AgentsHistoryPage() {
  const agents = useAgentHistory()
  const [selectedAgent, setSelectedAgent] = useState<AgentHistoryItem | null>(null)

  if (agents === undefined) {
    return (
      <section className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Agent History</h1>
        <div className="py-12 text-center text-muted-foreground">Loading agent history…</div>
      </section>
    )
  }

  if (agents.length === 0) {
    return (
      <section className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Agent History</h1>
        <div className="py-12 text-center text-muted-foreground">No agent history</div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Agent History</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="border-4 border-border bg-card shadow-[8px_8px_0px_0px_hsl(var(--secondary))]">
            <CardHeader className="border-b-4 border-border bg-muted/30 p-6">
              <h2 className="text-2xl font-black italic tracking-tighter uppercase">
                Cost Trend
              </h2>
            </CardHeader>
            <CardContent className="p-6">
              <CostTrendChart agents={agents} />
            </CardContent>
          </Card>

          <AgentPerformanceTable
            agents={agents}
            onSelectAgent={setSelectedAgent}
          />
        </div>

        <div>
          <AgentModelHistory changes={[]} />
        </div>
      </div>
    </section>
  )
}
