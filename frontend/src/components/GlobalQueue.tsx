import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { formatDuration } from '@/lib/formatDuration'
import { useActiveRuns } from '@/lib/useFleetApi'

/**
 * Displays active runs across all projects with auto-refresh every 10s
 */
export function GlobalQueue() {
  const { data, loading, error } = useActiveRuns()

  return (
    <Card className="border-4 border-border bg-card shadow-[8px_8px_0px_0px_hsl(var(--primary)/20)]">
      <CardHeader className="border-b-4 border-border bg-muted/30 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-3xl font-black italic tracking-tighter uppercase">GLOBAL_QUEUE</h3>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mt-1">
              {data?.length ?? 0} ACTIVE RUN{data?.length === 1 ? '' : 'S'} — AUTO-REFRESH 10S
            </p>
          </div>
          {data && data.length > 0 && (
            <span className="bg-primary text-primary-foreground font-black px-4 py-2 text-sm italic uppercase">
              {data.length} LIVE
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {error && (
          <div className="p-6 text-center text-destructive text-xs font-bold uppercase">
            ERROR: {error}
          </div>
        )}
        {loading && !data && (
          <div className="p-8 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
            LOADING...
          </div>
        )}
        {data && data.length === 0 && (
          <div className="p-8 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
            NO_ACTIVE_RUNS
          </div>
        )}
        {data && data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b-4 border-border bg-muted/20">
                <tr className="text-left">
                  <th className="px-4 py-3 font-black uppercase tracking-widest">PROJECT</th>
                  <th className="px-4 py-3 font-black uppercase tracking-widest">TASK</th>
                  <th className="px-4 py-3 font-black uppercase tracking-widest">RUN_ID</th>
                  <th className="px-4 py-3 font-black uppercase tracking-widest">STARTED</th>
                  <th className="px-4 py-3 font-black uppercase tracking-widest">DURATION</th>
                </tr>
              </thead>
              <tbody>
                {data.map(run => (
                  <tr key={run.runId} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-bold">
                      {run.projectName ?? run.projectSlug}
                    </td>
                    <td className="px-4 py-3 font-mono">{run.selectedTaskKey ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {run.runId.slice(0, 12)}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums">
                      {new Date(run.startedAt).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums">
                      {run.totalMs
                        ? formatDuration(run.totalMs)
                        : formatDuration(Date.now() - run.startedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
