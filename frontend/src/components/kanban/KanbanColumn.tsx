import type { DragEvent, ReactNode } from 'react'

import type { KanbanTask } from '@/hooks/useKanbanBoard'

export type KanbanColumnKey = 'backlog' | 'ready' | 'in_progress' | 'review' | 'done'

export type KanbanColumnDef = {
  key: KanbanColumnKey
  label: string
  color: string
}

export const COLUMNS: KanbanColumnDef[] = [
  { key: 'backlog', label: 'Backlog', color: '#8a8f98' },
  { key: 'ready', label: 'Ready', color: '#8a8f98' },
  { key: 'in_progress', label: 'In Progress', color: '#5e6ad2' },
  { key: 'review', label: 'For Review', color: '#27a644' },
  { key: 'done', label: 'Merged', color: '#27a644' },
]

export type KanbanColumnProps = {
  column: KanbanColumnDef
  tasks: KanbanTask[]
  isDragOver: boolean
  onDragOver: (e: DragEvent<HTMLDivElement>) => void
  onDragLeave: () => void
  onDrop: (e: DragEvent<HTMLDivElement>) => void
  children: ReactNode
}

export function KanbanColumn({
  column,
  tasks,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  children,
}: KanbanColumnProps) {
  return (
    <div className="flex flex-col min-w-[260px] w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color }} />
          <h3 className="text-sm font-semibold text-[#f7f8f8]">{column.label}</h3>
        </div>
        <span className="text-xs font-mono bg-[#141516] text-[#8a8f98] px-2 py-0.5 rounded-md">
          {tasks.length}
        </span>
      </div>
      <div
        role="list"
        aria-label={`${column.label} column`}
        data-column-key={column.key}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
          flex-1 flex flex-col gap-2 p-2 rounded-lg min-h-[200px] transition-colors
          ${isDragOver ? 'bg-[rgba(94,106,210,0.05)] ring-1 ring-inset ring-[#5e6ad2]' : 'bg-[#010102]'}
        `}
      >
        {children}
      </div>
    </div>
  )
}
