import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DispatchRow } from '@/components/timeline/DispatchRow'
import { ArchitectRow } from '@/components/timeline/ArchitectRow'
import { ExecutorRow } from '@/components/timeline/ExecutorRow'
import { ReviewerRow } from '@/components/timeline/ReviewerRow'
import { RecoveryRow } from '@/components/timeline/RecoveryRow'
import { useRunContract } from '@/hooks/useRunContract'

const STAGES = ['dispatch', 'architect', 'executor', 'reviewer', 'recovery'] as const

export function TaskTimelinePage() {
  const { taskId } = useParams()
  const { runContract, loading, error } = useRunContract(taskId)
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())

  const toggleStage = useCallback((stage: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev)
      if (next.has(stage)) {
        next.delete(stage)
      } else {
        next.add(stage)
      }
      return next
    })
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const currentStageIndex = STAGES.findIndex(
        s => expandedStages.has(s) || expandedStages.size === 0,
      )

      if (e.key === 'j') {
        e.preventDefault()
        const nextIndex = Math.min(currentStageIndex + 1, STAGES.length - 1)
        setExpandedStages(new Set([STAGES[nextIndex]]))
      } else if (e.key === 'k') {
        e.preventDefault()
        const prevIndex = Math.max(currentStageIndex - 1, 0)
        setExpandedStages(new Set([STAGES[prevIndex]]))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (taskId) {
          toggleStage(taskId)
        }
      }
    },
    [expandedStages, taskId, toggleStage],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (loading) {
    return (
      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
          <CardDescription>Fetching run contract for task {taskId}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!runContract) {
    return (
      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle>No run contract — legacy task</CardTitle>
          <CardDescription>
            Task {taskId} predates the Run Contract rollout or has no contract data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-background/60">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100">
                Run Timeline
              </div>
              <CardTitle className="text-2xl">Task {taskId}</CardTitle>
              <CardDescription className="max-w-3xl text-base text-slate-300">
                {runContract.objective}
              </CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link to="/">Back to dashboard</Link>
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Project:</span> {runContract.projectSlug} |{' '}
            <span className="font-medium">Created:</span>{' '}
            {new Intl.DateTimeFormat(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(runContract.createdAt)}
          </div>
        </CardHeader>
      </Card>

      <Card className="border-border/60 bg-background/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Keyboard shortcuts</CardTitle>
          <CardDescription>j/k to navigate stages, Enter to expand/collapse</CardDescription>
        </CardHeader>
      </Card>

      <Card className="overflow-hidden border-border/60 bg-background/60">
        <div className="border-b border-border">
          <DispatchRow
            contract={runContract}
            expanded={expandedStages.has('dispatch')}
            onToggleExpand={() => toggleStage('dispatch')}
          />
          <ArchitectRow
            contract={runContract}
            expanded={expandedStages.has('architect')}
            onToggleExpand={() => toggleStage('architect')}
          />
          <ExecutorRow
            contract={runContract}
            expanded={expandedStages.has('executor')}
            onToggleExpand={() => toggleStage('executor')}
          />
          <ReviewerRow
            contract={runContract}
            expanded={expandedStages.has('reviewer')}
            onToggleExpand={() => toggleStage('reviewer')}
          />
          <RecoveryRow
            contract={runContract}
            expanded={expandedStages.has('recovery')}
            onToggleExpand={() => toggleStage('recovery')}
          />
        </div>
      </Card>
    </div>
  )
}
