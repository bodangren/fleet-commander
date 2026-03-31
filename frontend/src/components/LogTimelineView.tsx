import { useCallback, useEffect, useState } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LogEntry, LogType } from '@/lib/fleetTypes'

const logTypeColors: Record<LogType, string> = {
  dispatch: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100',
  scoring: 'border-violet-400/30 bg-violet-400/10 text-violet-100',
  execution: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  completion: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
  error: 'border-rose-400/30 bg-rose-400/10 text-rose-100',
}

function formatTime(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString()
  } catch {
    return timestamp
  }
}

function getLogSummary(entry: LogEntry): string {
  const data = entry.data
  if (!data) {
    return entry.type
  }

  switch (entry.type) {
    case 'dispatch':
      return `Dispatched: ${data.taskTitle ?? data.taskId ?? 'unknown'} → ${data.agentTag ?? 'unassigned'}`
    case 'completion':
      return `Completed: ${data.taskId ?? 'unknown'} (${data.status ?? 'done'}) in ${data.durationMs ?? '?'}ms`
    case 'error':
      return `Error: ${data.errorMessage ?? data.taskId ?? 'unknown error'}`
    case 'scoring':
      return `Scored ${data.candidates ?? '?'} candidates${data.fallback ? ' (fallback)' : ''}`
    case 'execution':
      return `Execution: ${data.taskId ?? 'unknown'} via ${data.harness ?? 'unknown harness'}`
    default:
      return entry.type
  }
}

export function LogTimelineView({ projectId }: { projectId: string }) {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: '50' })
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/logs?${params}`,
      )
      const payload = (await response.json()) as { logs?: LogEntry[]; error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to load logs')
      }
      setEntries(payload.logs ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  const filtered = typeFilter
    ? entries.filter(e => e.type === typeFilter)
    : entries

  return (
    <Card className="border-border/60 bg-background/60">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-2">
          <CardTitle className="text-base">Execution Timeline</CardTitle>
          <CardDescription>
            Recent dispatch, execution, and completion events.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs text-foreground"
          >
            <option value="">All events</option>
            <option value="dispatch">Dispatch</option>
            <option value="completion">Completion</option>
            <option value="error">Errors</option>
            <option value="scoring">Scoring</option>
            <option value="execution">Execution</option>
          </select>
          <Button type="button" variant="outline" size="sm" onClick={() => void fetchLogs()}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading logs...</p>
        ) : error ? (
          <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">
            No log entries found.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((entry, i) => (
              <div
                key={`${entry.timestamp}-${i}`}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-black/10 p-3"
              >
                <span
                  className={cn(
                    'mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]',
                    logTypeColors[entry.type] ?? 'border-border/60 text-muted-foreground',
                  )}
                >
                  {entry.type}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{getLogSummary(entry)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(entry.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
