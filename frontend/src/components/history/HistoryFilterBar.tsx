import type { HistoryFilters } from '@/lib/historyFilters'

export interface HistoryFilterBarProps {
  filters: HistoryFilters
  onChange: (updatedFilters: Partial<HistoryFilters>) => void
}

/**
 * Renders filter controls for status, project, and agent selection
 */
export function HistoryFilterBar({ filters, onChange }: HistoryFilterBarProps) {
  return (
    <div className="flex gap-4 flex-wrap">
      <select
        value={filters.status ?? ''}
        onChange={e => onChange({ status: e.target.value })}
        className="px-4 py-2 border-2 border-border rounded-md bg-card"
        aria-label="Filter by status"
      >
        <option value="">All Statuses</option>
        <option value="done">done</option>
        <option value="in_progress">in_progress</option>
        <option value="todo">todo</option>
      </select>

      <select
        value={filters.project ?? ''}
        onChange={e => onChange({ project: e.target.value })}
        className="px-4 py-2 border-2 border-border rounded-md bg-card"
        aria-label="Filter by project"
      >
        <option value="">All Projects</option>
        <option value="foundation">foundation</option>
      </select>

      <select
        value={filters.agent ?? ''}
        onChange={e => onChange({ agent: e.target.value })}
        className="px-4 py-2 border-2 border-border rounded-md bg-card"
        aria-label="Filter by agent"
      >
        <option value="">All Agents</option>
        <option value="alice">alice</option>
      </select>
    </div>
  )
}
