import type { SprintHistoryItem } from '@/__fixtures__/historyFixtures'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface SprintDetailViewProps {
  sprint: SprintHistoryItem | null
  onBack?: () => void
}

export function SprintDetailView({ sprint, onBack }: SprintDetailViewProps) {
  if (!sprint) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Select a sprint to view details
      </div>
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
              {sprint.name}
            </CardTitle>
            <div className="mt-1">
              <span
                className={cn(
                  'inline-block px-2 py-1 text-xs font-bold uppercase tracking-wider',
                  sprint.status === 'closed' && 'bg-secondary text-secondary-foreground',
                  sprint.status === 'active' && 'bg-primary text-primary-foreground',
                  sprint.status === 'planned' && 'bg-muted text-muted-foreground',
                )}
              >
                {sprint.status}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Budget
            </span>
            <p className="text-2xl font-black tabular-nums">{sprint.budget}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Actual Cost
            </span>
            <p className="text-2xl font-black tabular-nums">{sprint.actualCost}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Points Delivered
            </span>
            <p className="text-2xl font-black tabular-nums">
              {sprint.pointsDelivered}
              <span className="text-lg text-muted-foreground">
                /{sprint.pointsEstimated}
              </span>
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Tasks
            </span>
            <p className="text-2xl font-black tabular-nums">
              {sprint.completedCount}
              <span className="text-lg text-muted-foreground">/{sprint.taskCount}</span>
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Velocity
            </span>
            <p className="text-2xl font-black tabular-nums">{sprint.velocity.toFixed(2)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}