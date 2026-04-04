import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePipelineList, triggerPipeline } from '@/hooks/usePipelineData'
import { cn } from '@/lib/utils'
import { formatTime, statusColors, statusIcons } from '@/lib/pipelineUtils.tsx'
import { Play } from 'lucide-react'
import { useState } from 'react'

export function PipelineList() {
  const { executions, loading, error, refresh } = usePipelineList()
  const [triggering, setTriggering] = useState<string | null>(null)
  const [triggerError, setTriggerError] = useState<string | null>(null)

  const handleTrigger = async (name: string) => {
    setTriggering(name)
    setTriggerError(null)
    try {
      await triggerPipeline(name)
      refresh()
    } catch (err) {
      setTriggerError(err instanceof Error ? err.message : 'Failed to trigger pipeline')
    } finally {
      setTriggering(null)
    }
  }

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
        <CardContent className="py-8 text-center text-muted-foreground">
          {error}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle>Pipelines</CardTitle>
        <CardDescription>Recent pipeline executions and triggers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {triggerError && (
          <div className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
            {triggerError}
          </div>
        )}

        {executions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No pipeline executions yet. Trigger a pipeline to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {executions.map((exec) => (
              <div
                key={exec.executionId}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 p-3"
              >
                <div className="flex items-center gap-3">
                  {statusIcons[exec.status]}
                  <div>
                    <div className="font-medium">{exec.pipelineName}</div>
                    <div className="text-xs text-muted-foreground">
                      {exec.startedAt ? formatTime(exec.startedAt) : '—'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-medium', statusColors[exec.status])}>
                    {exec.status}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTrigger(exec.pipelineName)}
                    disabled={triggering === exec.pipelineName}
                  >
                    {triggering === exec.pipelineName ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
