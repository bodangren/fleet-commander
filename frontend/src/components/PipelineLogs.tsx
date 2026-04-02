import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getPipelineLogs } from '@/hooks/usePipelineData'
import { cn } from '@/lib/utils'
import { Loader2, CheckCircle2, XCircle, Terminal } from 'lucide-react'
import { useEffect, useState } from 'react'

interface LogEntry {
  stage: string
  step: string
  status: string
  output?: string
  error?: string
  startedAt?: string
  completedAt?: string
}

const stepStatusIcons: Record<string, React.ReactNode> = {
  succeeded: <CheckCircle2 className="h-3 w-3 text-green-400" />,
  failed: <XCircle className="h-3 w-3 text-red-400" />,
  running: <Loader2 className="h-3 w-3 animate-spin text-blue-400" />,
}

export function PipelineLogs({ executionId }: { executionId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStage, setFilterStage] = useState<string | null>(null)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getPipelineLogs(executionId)
        setLogs(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch logs')
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [executionId])

  if (loading) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-card/80 backdrop-blur">
        <CardContent className="py-8 text-center text-muted-foreground">{error}</CardContent>
      </Card>
    )
  }

  const stages = [...new Set(logs.map((l) => l.stage))]
  const filteredLogs = filterStage ? logs.filter((l) => l.stage === filterStage) : logs

  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Execution Logs</CardTitle>
            <CardDescription>Detailed output from each pipeline step.</CardDescription>
          </div>
          {stages.length > 1 && (
            <div className="flex gap-2">
              <button
                className={cn(
                  'rounded-md px-2 py-1 text-xs',
                  !filterStage
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background/40 text-muted-foreground hover:bg-background/60',
                )}
                onClick={() => setFilterStage(null)}
              >
                All
              </button>
              {stages.map((stage) => (
                <button
                  key={stage}
                  className={cn(
                    'rounded-md px-2 py-1 text-xs',
                    filterStage === stage
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background/40 text-muted-foreground hover:bg-background/60',
                  )}
                  onClick={() => setFilterStage(stage)}
                >
                  {stage}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 font-mono text-sm">
          {filteredLogs.map((log, i) => (
            <div key={i} className="rounded-md border border-border/60 bg-background/40 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {stepStatusIcons[log.status] ?? <Terminal className="h-3 w-3" />}
                <span className="font-medium text-foreground">{log.stage}</span>
                <span>/</span>
                <span>{log.step}</span>
                <span className={cn('ml-auto', log.status === 'succeeded' ? 'text-green-400' : 'text-red-400')}>
                  {log.status}
                </span>
              </div>
              {log.output && (
                <pre className="mt-2 whitespace-pre-wrap rounded bg-black/30 p-2 text-xs text-muted-foreground">
                  {log.output}
                </pre>
              )}
              {log.error && (
                <pre className="mt-2 whitespace-pre-wrap rounded bg-red-500/10 p-2 text-xs text-red-400">
                  {log.error}
                </pre>
              )}
            </div>
          ))}
          {filteredLogs.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">No log entries.</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
