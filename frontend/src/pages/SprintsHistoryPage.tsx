import { useState } from 'react'
import { useSprintHistory } from '@/hooks/useSprintHistory'
import { SprintHistoryTable } from '@/components/history/SprintHistoryTable'
import { SprintDetailView } from '@/components/history/SprintDetailView'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { SprintHistoryItem } from '@/__fixtures__/historyFixtures'

export function SprintsHistoryPage() {
  const sprints = useSprintHistory()
  const [selectedSprint, setSelectedSprint] = useState<SprintHistoryItem | null>(null)

  if (sprints === undefined) {
    return (
      <section className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Sprint History</h1>
        <div className="py-12 text-center text-muted-foreground">Loading sprint history…</div>
      </section>
    )
  }

  if (sprints.length === 0) {
    return (
      <section className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Sprint History</h1>
        <div className="py-12 text-center text-muted-foreground">No sprint history</div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Sprint History</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="border-4 border-border bg-card shadow-[8px_8px_0px_0px_hsl(var(--secondary))]">
            <CardHeader className="border-b-4 border-border bg-muted/30 p-6">
              <h2 className="text-2xl font-black italic tracking-tighter uppercase">
                Velocity Trend
              </h2>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-48 flex items-end gap-2">
                {sprints.map(sprint => (
                  <div key={sprint._id} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-primary transition-all"
                      style={{
                        height: `${Math.min(sprint.velocity * 40, 160)}px`,
                      }}
                    />
                    <span className="text-xs font-bold uppercase">{sprint.name}</span>
                    <span className="text-xs tabular-nums">{sprint.velocity.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <SprintHistoryTable
            sprints={sprints}
            onSelectSprint={setSelectedSprint}
          />
        </div>

        <div>
          <SprintDetailView
            sprint={selectedSprint}
            onBack={selectedSprint ? () => setSelectedSprint(null) : undefined}
          />
        </div>
      </div>
    </section>
  )
}