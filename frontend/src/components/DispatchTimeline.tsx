import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface DispatchTimelineEntry {
  taskId: string
  projectSlug: string
  objective: string
  createdAt: number
  hasArchitect: boolean
  hasExecutor: boolean
  hasReviewer: boolean
  hasRecovery: boolean
  rejectionCount: number
}

export interface DispatchTimelineData {
  entries: DispatchTimelineEntry[]
}

interface DispatchTimelineProps {
  data?: DispatchTimelineData
  loading?: boolean
}

function StageBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${color}`}
    >
      {label}
    </span>
  )
}

function formatTime(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleString()
  } catch {
    return String(timestamp)
  }
}

export function DispatchTimeline({ data, loading }: DispatchTimelineProps) {
  if (loading || data === undefined) {
    return (
      <Card className="border-border/60 bg-background/60">
        <CardContent className="py-8">
          <p className="text-center text-sm text-muted-foreground">Loading dispatch timeline...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4" data-testid="dispatch-timeline">
      <h2 className="text-lg font-semibold">Dispatch Timeline</h2>

      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle className="text-base">Recent Run Contracts</CardTitle>
          <CardDescription>Cross-task dispatch stream across all projects</CardDescription>
        </CardHeader>
        <CardContent>
          {data.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No run contracts found</p>
          ) : (
            <div className="space-y-2">
              {data.entries.map(entry => (
                <div
                  key={entry.taskId}
                  data-testid={`timeline-row-${entry.taskId}`}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-black/10 p-3"
                >
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-medium text-cyan-300">
                    {entry.projectSlug.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/tasks/${encodeURIComponent(entry.taskId)}/timeline`}
                        className="truncate text-sm font-medium text-foreground hover:text-cyan-300 hover:underline"
                        data-testid={`timeline-link-${entry.taskId}`}
                      >
                        {entry.objective || entry.taskId}
                      </Link>
                      {entry.rejectionCount > 0 && (
                        <span className="shrink-0 rounded bg-rose-400/10 px-1.5 py-0.5 text-[10px] text-rose-300">
                          {entry.rejectionCount} rejection{entry.rejectionCount === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.projectSlug} · {formatTime(entry.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1">
                    {entry.hasArchitect && (
                      <StageBadge label="A" color="bg-violet-400/10 text-violet-300" />
                    )}
                    {entry.hasExecutor && (
                      <StageBadge label="E" color="bg-amber-400/10 text-amber-300" />
                    )}
                    {entry.hasReviewer && (
                      <StageBadge label="R" color="bg-emerald-400/10 text-emerald-300" />
                    )}
                    {entry.hasRecovery && (
                      <StageBadge label="X" color="bg-rose-400/10 text-rose-300" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
