import { useAgentHistory } from '@/hooks/useSprintHistory'
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout'
import { AgentPerformanceTable } from '@/components/history/AgentPerformanceTable'
import { CostTrendChart } from '@/components/history/CostTrendChart'

export function AgentsHistoryPage() {
  const data = useAgentHistory()
  const timedOut = useLoadingTimeout(data === undefined)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Agent History</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Historical performance and cost trends by agent
        </p>
      </div>

      {data === undefined ? (
        timedOut ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
            Unable to load agent history. The backend may be unavailable.
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">Loading agent history…</div>
        )
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
