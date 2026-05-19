import type { Sprint } from '@/hooks/useKanbanBoard'

function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`
}

function formatPercent(n: number): string {
  return `${Math.round(n * 100)}%`
}

export type SprintInfoBarProps = {
  sprint: Sprint
  totalPoints: number
  totalEstimate: number
  onCloseSprint?: () => void
  closing?: boolean
}

export function SprintInfoBar({
  sprint,
  totalPoints,
  totalEstimate,
  onCloseSprint,
  closing,
}: SprintInfoBarProps) {
  const budgetSpent = sprint.actualCost ?? 0
  const budget = sprint.budget ?? 0
  const percentSpent = budget > 0 ? budgetSpent / budget : 0

  const statusColor =
    sprint.status === 'active'
      ? 'bg-[#5e6ad2] text-white'
      : sprint.status === 'closed'
        ? 'bg-[#27a644] text-white'
        : 'bg-[#141516] text-[#8a8f98] border border-[#23252a]'

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-[#0f1011] border border-[#23252a] rounded-lg flex-wrap">
      <div className="flex items-center gap-4">
        <div>
          <div className="text-base font-semibold tracking-[-0.2px]">{sprint.name}</div>
          <div className="text-sm text-[#8a8f98] mt-0.5">
            {totalPoints} story points · {sprint.taskCount} tasks
          </div>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${statusColor}`}>
          {sprint.status === 'active'
            ? 'Active'
            : sprint.status === 'closed'
              ? 'Closed'
              : 'Planned'}
        </span>
      </div>

      <div className="flex items-center gap-6 flex-wrap">
        <div className="text-right">
          <div className="text-xs text-[#8a8f98]">Budget</div>
          <div className="text-base font-semibold font-mono">
            <span className={percentSpent > 0.9 ? 'text-[#eb3d54]' : 'text-[#27a644]'}>
              {formatCurrency(budgetSpent)}
            </span>{' '}
            <span className="text-[#62666d] text-sm font-normal">/ {formatCurrency(budget)}</span>
          </div>
        </div>

        <div className="w-28">
          <div className="text-[11px] text-[#8a8f98] mb-1">{formatPercent(percentSpent)} spent</div>
          <div className="h-1.5 bg-[#141516] rounded-sm overflow-hidden">
            <div
              className="h-full rounded-sm transition-all"
              style={{
                width: `${Math.min(percentSpent * 100, 100)}%`,
                backgroundColor: percentSpent > 0.9 ? '#eb3d54' : '#27a644',
              }}
            />
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-[#8a8f98]">Est. Cost</div>
          <div className="text-base font-semibold font-mono">{formatCurrency(totalEstimate)}</div>
        </div>

        {sprint.status === 'active' && onCloseSprint && (
          <button
            type="button"
            onClick={onCloseSprint}
            disabled={closing}
            className="text-xs font-medium px-3 py-1.5 rounded-md bg-[#141516] border border-[#23252a] text-[#d0d6e0] hover:bg-[#18191a] hover:text-[#f7f8f8] transition-colors disabled:opacity-50"
          >
            {closing ? 'Closing...' : 'Close Sprint'}
          </button>
        )}

        {sprint.status === 'planned' && (
          <button
            type="button"
            onClick={onCloseSprint}
            disabled={closing}
            className="text-xs font-medium px-3 py-1.5 rounded-md bg-[#5e6ad2] text-white hover:bg-[#828fff] transition-colors disabled:opacity-50"
          >
            {closing ? 'Starting...' : 'Set Active'}
          </button>
        )}
      </div>
    </div>
  )
}
