import { useState } from 'react'
import type { SprintHistoryItem } from '@/__fixtures__/historyFixtures'
import { cn } from '@/lib/utils'

export interface SprintHistoryTableProps {
  sprints: SprintHistoryItem[]
  onSelectSprint?: (sprint: SprintHistoryItem) => void
}

type SortKey = 'name' | 'status'
type SortDir = 'asc' | 'desc'

export function SprintHistoryTable({ sprints, onSelectSprint }: SprintHistoryTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = [...sprints].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })

  const handleRowClick = (sprint: SprintHistoryItem) => {
    onSelectSprint?.(sprint)
  }

  if (sprints.length === 0) {
    return <div className="py-12 text-center text-muted-foreground">No sprints found</div>
  }

  return (
    <div className="border-2 border-border bg-card">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-border bg-muted/30">
            <th
              role="columnheader"
              onClick={() => handleSort('name')}
              className="cursor-pointer p-4 text-left text-xs font-black uppercase tracking-wider"
            >
              Name
            </th>
            <th
              role="columnheader"
              onClick={() => handleSort('status')}
              className="cursor-pointer p-4 text-left text-xs font-black uppercase tracking-wider"
            >
              Status
            </th>
            <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Budget</th>
            <th className="p-4 text-left text-xs font-black uppercase tracking-wider">
              Actual Cost
            </th>
            <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Velocity</th>
            <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Points</th>
            <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Tasks</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(sprint => (
            <tr
              key={sprint._id}
              onClick={() => handleRowClick(sprint)}
              className="border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
              data-testid={`sprint-row-${sprint._id}`}
            >
              <td className="p-4 font-medium">{sprint.name}</td>
              <td className="p-4">
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
              </td>
              <td className="p-4 tabular-nums">{sprint.budget.toFixed(2)}</td>
              <td className="p-4 tabular-nums">{sprint.actualCost.toFixed(2)}</td>
              <td className="p-4 tabular-nums">{sprint.velocity.toFixed(2)}</td>
              <td className="p-4 tabular-nums">
                {sprint.pointsDelivered} / {sprint.pointsEstimated}
              </td>
              <td className="p-4 tabular-nums">
                {sprint.completedCount} / {sprint.taskCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
