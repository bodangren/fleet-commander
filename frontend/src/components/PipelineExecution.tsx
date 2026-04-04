import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatTime, statusColors, statusIcons } from '@/lib/pipelineUtils'
import { ChevronDown, ChevronRight, Clock } from 'lucide-react'
import { useState } from 'react'

interface StageInfo {
  stageName: string
  status: string
  steps?: Array<{
    stepName: string
    status: string
    output?: string
    error?: string
  }>
}

interface PipelineExecutionData {
  executionId: string
  pipelineName: string
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled'
  stages?: StageInfo[]
  startedAt: number
  completedAt?: number
}

export function PipelineExecutionCard({ execution }: { execution: PipelineExecutionData }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {statusIcons[execution.status]}
            <div>
              <CardTitle>{execution.pipelineName}</CardTitle>
              <CardDescription>
                Started {formatTime(execution.startedAt)}
                {execution.completedAt && ` · Completed ${formatTime(execution.completedAt)}`}
              </CardDescription>
            </div>
          </div>
          <span className={cn('text-sm font-medium', statusColors[execution.status])}>
            {execution.status}
          </span>
        </div>
      </CardHeader>
      {execution.stages && execution.stages.length > 0 && (
        <CardContent>
          <button
            className="flex w-full items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {execution.stages.length} stage{execution.stages.length !== 1 ? 's' : ''}
          </button>

          {expanded && (
            <div className="mt-3 space-y-2">
              {execution.stages.map((stage, i) => (
                <div
                  key={i}
                  className="rounded-md border border-border/60 bg-background/40 p-3"
                >
                  <div className="flex items-center gap-2">
                    {statusIcons[stage.status] ?? <Clock className="h-3 w-3 text-muted-foreground" />}
                    <span className="font-medium">{stage.stageName}</span>
                    <span className={cn('ml-auto text-xs', statusColors[stage.status])}>
                      {stage.status}
                    </span>
                  </div>
                  {stage.steps && stage.steps.length > 0 && (
                    <div className="mt-2 space-y-1 pl-6">
                      {stage.steps.map((step, j) => (
                        <div key={j} className="flex items-center gap-2 text-sm">
                          {statusIcons[step.status] ?? <Clock className="h-3 w-3 text-muted-foreground" />}
                          <span className="text-muted-foreground">{step.stepName}</span>
                          {step.error && (
                            <span className="ml-auto text-xs text-red-400">{step.error.slice(0, 50)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
