import { useState } from 'react'
import { useSprintHistory } from '@/hooks/useSprintHistory'
import { SprintHistoryTable } from '@/components/history/SprintHistoryTable'
import { SprintDetailView } from '@/components/history/SprintDetailView'
import { VelocityTrendChart } from '@/components/history/VelocityTrendChart'
import type { SprintHistoryItem } from '@/__fixtures__/historyFixtures'

export function SprintsHistoryPage() {
  const [selectedSprint, setSelectedSprint] = useState<SprintHistoryItem | null>(null)
  const data = useSprintHistory()

  if (selectedSprint) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Sprint History</h2>
        </div>
        <SprintDetailView sprint={selectedSprint} onBack={() => setSelectedSprint(null)} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Sprint History</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Past sprints with performance metrics and retrospectives
        </p>
      </div>

      {data === undefined ? (
        <div className="py-12 text-center text-muted-foreground">Loading sprint history…</div>
      ) : data.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No sprint history</div>
      ) : (
        <>
          <SprintHistoryTable sprints={data} onSelectSprint={setSelectedSprint} />
          <VelocityTrendChart sprints={data} />
        </>
      )}
    </div>
  )
}
