import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { parsePlanFile } from '../../../shared/conductor'
import type { BoardTask } from '../../../shared/board'

interface PlanDetailPanelProps {
  task: BoardTask
  onClose: () => void
  planContents?: string | null
  isLoading?: boolean
  error?: string | null
}

export function PlanDetailPanel({
  task,
  onClose,
  planContents = null,
  isLoading = false,
  error = null,
}: PlanDetailPanelProps) {
  const phases = useMemo(() => {
    if (!planContents) {
      return []
    }
    return parsePlanFile(planContents)
  }, [planContents])

  return (
    <aside
      className="flex h-full w-96 flex-col border-l border-border bg-muted/30 animate-in slide-in-from-right-6 duration-200"
      data-testid="plan-detail-panel"
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="space-y-1">
          <p className="text-xs uppercase text-muted-foreground">Plan Detail</p>
          <h2 className="text-sm font-semibold text-foreground">{task.trackTitle}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </header>
      <div className="flex-1 space-y-4 overflow-auto px-4 py-4">
        <div>
          <p className="text-[11px] uppercase text-muted-foreground">Task</p>
          <p className="mt-1 font-mono text-sm text-foreground">{task.title}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{task.phase}</p>
        </div>
        <div className="space-y-3 rounded border border-dashed border-border bg-background/60 p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Plan Content</p>
          {isLoading ? (
            <p className="mt-2 font-mono text-xs text-muted-foreground">Loading plan...</p>
          ) : null}
          {error ? (
            <p className="mt-2 text-xs text-destructive">Failed to load plan: {error}</p>
          ) : null}
          {!isLoading && !error ? (
            phases.length > 0 ? (
              <div className="space-y-4">
                {phases.map(phase => (
                  <div key={phase.title} className="space-y-2">
                    <h3 className="text-xs font-semibold text-foreground">{phase.title}</h3>
                    <div className="space-y-1">
                      {phase.tasks.map(taskItem => (
                        <div key={`${phase.title}-${taskItem.title}`} className="flex gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {taskItem.marker}
                          </span>
                          <span className="text-xs text-foreground">{taskItem.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                Plan content will appear here once loaded.
              </p>
            )
          ) : null}
        </div>
      </div>
    </aside>
  )
}
