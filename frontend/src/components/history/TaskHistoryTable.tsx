import { useState } from 'react'
import type { TaskHistoryItem } from '@/__fixtures__/historyFixtures'
import { cn } from '@/lib/utils'

export interface TaskHistoryTableProps {
  tasks: TaskHistoryItem[]
  onSelectTask?: (task: TaskHistoryItem) => void
}

type SortKey = 'title' | 'status'
type SortDir = 'asc' | 'desc'

/**
 * Sortable table of tasks with title, status, agent, project, cost
 */
export function TaskHistoryTable({ tasks, onSelectTask }: TaskHistoryTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = sortKey
    ? [...tasks].sort((a, b) => {
        const av = a[sortKey]
        const bv = b[sortKey]
        const cmp = av < bv ? -1 : av > bv ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
    : tasks

  const handleRowClick = (task: TaskHistoryItem) => {
    onSelectTask?.(task)
  }

  if (tasks.length === 0) {
    return <div className="py-12 text-center text-muted-foreground">No tasks found</div>
  }

  return (
    <div className="border-2 border-border bg-card">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-border bg-muted/30">
            <th
              role="columnheader"
              onClick={() => handleSort('title')}
              className="cursor-pointer p-4 text-left text-xs font-black uppercase tracking-wider"
            >
              Title
            </th>
            <th
              role="columnheader"
              onClick={() => handleSort('status')}
              className="cursor-pointer p-4 text-left text-xs font-black uppercase tracking-wider"
            >
              Status
            </th>
            <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Agent</th>
            <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Project</th>
            <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Cost</th>
            <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Points</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(task => (
            <tr
              key={task._id}
              onClick={() => handleRowClick(task)}
              className="border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <td className="p-4 font-medium">{task.title}</td>
              <td className="p-4">
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
              </td>
              <td className="p-4">{task.agent}</td>
              <td className="p-4">{task.projectSlug}</td>
              <td className="p-4 tabular-nums">{task.cost.toFixed(2)}</td>
              <td className="p-4 tabular-nums">{task.storyPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
