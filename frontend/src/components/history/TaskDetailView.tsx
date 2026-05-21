import type { TaskHistoryItem } from '@/__fixtures__/historyFixtures'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface TaskDetailViewProps {
  task: TaskHistoryItem | null
  onBack?: () => void
}

export function TaskDetailView({ task, onBack }: TaskDetailViewProps) {
  if (!task) {
    return (
      <div className="py-12 text-center text-muted-foreground">Select a task to view details</div>
    )
  }

  return (
    <Card className="border-4 border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between border-b-2 border-border bg-muted/30 p-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="outline" size="icon" onClick={onBack} aria-label="Back">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Button>
          )}
          <div>
            <CardTitle className="text-2xl font-black italic tracking-tighter uppercase">
              {task.title}
            </CardTitle>
            <div className="mt-1">
              <span
                className={cn(
                  'inline-block px-2 py-1 text-xs font-bold uppercase tracking-wider',
                  task.status === 'done' && 'bg-secondary text-secondary-foreground',
                  task.status === 'in_progress' && 'bg-primary text-primary-foreground',
                  task.status === 'todo' && 'bg-muted text-muted-foreground',
                )}
              >
                {task.status}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Cost
            </span>
            <p className="text-2xl font-black tabular-nums">
              $<span>{task.cost.toFixed(2)}</span>
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Agent
            </span>
            <p className="text-2xl font-black">{task.agent}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Project
            </span>
            <p className="text-2xl font-black">{task.projectSlug}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Story Points
            </span>
            <p className="text-2xl font-black tabular-nums">{task.storyPoints}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Status
            </span>
            <p className="text-2xl font-black">{task.status}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
