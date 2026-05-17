import type { MockSprint } from '@/__fixtures__/dashboardFixtures'

import { calculateBudgetPercent } from '@/lib/dashboard'
import { cn } from '@/lib/utils'

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export function SprintStatus({ sprint }: { sprint: MockSprint }) {
  const budgetProgress = Math.round(
    calculateBudgetPercent(sprint.budget.actual, sprint.budget.estimated),
  )

  return (
    <div className="border-2 border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-2xl font-black italic tracking-tighter uppercase">{sprint.name}</h3>
          <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
            {sprint.status}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-medium uppercase tracking-wider text-xs">
            Budget
          </span>
          <span className="font-bold tabular-nums">
            {formatCurrency(sprint.budget.actual)} / {formatCurrency(sprint.budget.estimated)}
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={budgetProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 bg-secondary/20 border-2 border-border"
        >
          <div
            className={cn(
              'h-full transition-all',
              budgetProgress > 100 ? 'bg-destructive' : 'bg-primary',
            )}
            style={{ width: `${Math.min(budgetProgress, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Tasks
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black tabular-nums">{sprint.tasks.done}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-lg text-muted-foreground tabular-nums">{sprint.tasks.total}</span>
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Points
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black tabular-nums">{sprint.points.delivered}</span>
            {sprint.points.estimated > 0 && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-lg text-muted-foreground tabular-nums">
                  {sprint.points.estimated}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
