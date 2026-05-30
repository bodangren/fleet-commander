export interface BudgetBurndownChartProps {
  budget: number
  actualCost: number
  costTrend: Array<{ sprintName: string; budget: number; actualCost: number }>
}

/**
 * Renders budget vs actual cost bar with sprint cost trend comparison
 */
export function BudgetBurndownChart({ budget, actualCost, costTrend }: BudgetBurndownChartProps) {
  const maxVal = Math.max(
    budget,
    actualCost,
    ...costTrend.flatMap(s => [s.budget, s.actualCost]),
    1,
  )
  const utilizationPct = budget > 0 ? (actualCost / budget) * 100 : 0
  const overBudget = actualCost > budget

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
          Budget Burndown
        </span>
        <span className="text-sm tabular-nums">
          <span className={overBudget ? 'text-destructive font-bold' : 'text-foreground'}>
            ${actualCost.toFixed(2)}
          </span>
          <span className="text-muted-foreground"> / ${budget.toFixed(2)}</span>
        </span>
      </div>

      <div className="h-4 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${overBudget ? 'bg-destructive' : 'bg-primary'}`}
          style={{ width: `${Math.min(utilizationPct, 100)}%` }}
        />
      </div>

      {costTrend.length > 1 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Cost per Sprint
          </div>
          <div className="flex items-end gap-1 h-32">
            {costTrend.map((sprint, i) => {
              const barMax = Math.max(...costTrend.map(s => Math.max(s.budget, s.actualCost)), 1)
              const budgetH = (sprint.budget / barMax) * 120
              const actualH = (sprint.actualCost / barMax) * 120
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="relative w-full flex gap-px items-end"
                    style={{ height: '120px' }}
                  >
                    <div
                      className="flex-1 bg-muted/50 border border-border"
                      style={{ height: `${budgetH}px` }}
                      title={`Budget: $${sprint.budget.toFixed(2)}`}
                    />
                    <div
                      className={`flex-1 ${sprint.actualCost > sprint.budget ? 'bg-destructive' : 'bg-primary'}`}
                      style={{ height: `${actualH}px` }}
                      title={`Actual: $${sprint.actualCost.toFixed(2)}`}
                    />
                  </div>
                  <span className="text-[10px] font-bold truncate w-full text-center">
                    {sprint.sprintName}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-muted/50 border border-border" /> Budget
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-primary" /> Actual
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
