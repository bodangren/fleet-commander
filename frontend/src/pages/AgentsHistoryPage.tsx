import { useAgentHistory } from '@/hooks/useSprintHistory'
import { AgentPerformanceTable } from '@/components/history/AgentPerformanceTable'
import { CostTrendChart } from '@/components/history/CostTrendChart'

export function AgentsHistoryPage() {
  const data = useAgentHistory()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Agent History</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Historical performance and cost trends by agent
        </p>
      </div>

      {data === undefined ? (
        <div className="py-12 text-center text-muted-foreground">Loading agent history…</div>
      ) : data.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No agent history</div>
      ) : (
        <>
          <AgentPerformanceTable agents={data} />
          <CostTrendChart agents={data} />
        </>
      )}
    </div>
  )
}
