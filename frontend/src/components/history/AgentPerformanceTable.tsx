import { useState } from 'react'
import type { AgentHistoryItem } from '@/__fixtures__/historyFixtures'
import { cn } from '@/lib/utils'

export interface AgentPerformanceTableProps {
  agents: AgentHistoryItem[]
  onSelectAgent?: (agent: AgentHistoryItem) => void
}

type SortKey = 'displayName'
type SortDir = 'asc' | 'desc'

export function AgentPerformanceTable({ agents, onSelectAgent }: AgentPerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('displayName')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = [...agents].sort((a, b) => {
    const av = a[sortKey] || ''
    const bv = b[sortKey] || ''
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })

  const handleRowClick = (agent: AgentHistoryItem) => {
    onSelectAgent?.(agent)
  }

  if (agents.length === 0) {
    return <div className="py-12 text-center text-muted-foreground">No agents found</div>
  }

  return (
    <div className="border-2 border-border bg-card">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-border bg-muted/30">
            <th
              role="columnheader"
              onClick={() => handleSort('displayName')}
              className="cursor-pointer p-4 text-left text-xs font-black uppercase tracking-wider"
            >
              Name
            </th>
            <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Model</th>
            <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Tasks</th>
            <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Cost</th>
            <th className="p-4 text-left text-xs font-black uppercase tracking-wider">
              Reliability
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(agent => (
            <tr
              key={agent._id}
              onClick={() => handleRowClick(agent)}
              className="border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <td className="p-4 font-medium">{agent.displayName || 'Unknown Agent'}</td>
              <td className="p-4">{agent.model}</td>
              <td className="p-4 tabular-nums">{agent.tasksCompleted}</td>
              <td className="p-4 tabular-nums">${agent.totalCost.toFixed(2)}</td>
              <td className="p-4 tabular-nums">{agent.reliability.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
