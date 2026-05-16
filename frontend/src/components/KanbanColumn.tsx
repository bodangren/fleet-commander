import type { ReactNode } from 'react'

import type { Column } from '@/lib/kanban'

import { cn } from '@/lib/utils'

let _draggedTaskId: string | null = null

export function setKanbanDragState(taskId: string | null) {
  _draggedTaskId = taskId
}

export type KanbanColumnProps = {
  column: Column
  tasks: Array<{
    _id: string
    title: string
    description?: string
    status: string
    priority: 'low' | 'medium' | 'high'
    projectId: string
    createdAt: number
    updatedAt: number
  }>
  onDropTask: (taskId: string, columnId: string) => void
  children?: ReactNode
}

export function KanbanColumn({
  column,
  tasks,
  onDropTask,
  children,
}: KanbanColumnProps) {
  return (
    <div className="flex flex-col min-w-[280px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm uppercase tracking-wider">{column.name}</h3>
        <span className="text-xs font-mono bg-muted px-2 py-0.5">{tasks.length}</span>
      </div>
      <ul
        role="list"
        data-column-id={column._id}
        onDragOver={e => e.preventDefault()}
        onDragEnter={() => {}}
        onDrop={e => {
          e.preventDefault()
          let taskId = _draggedTaskId
          if (!taskId) {
            try {
              taskId = e.dataTransfer.getData('task/id')
            } catch {
              taskId = null
            }
          }
          if (taskId) {
            onDropTask(taskId, column._id)
          }
          _draggedTaskId = null
        }}
        className={cn(
          'flex-1 flex flex-col gap-2 p-2 border-2 border-dashed border-border rounded-lg min-h-[200px] transition-colors',
        )}
      >
        {children}
      </ul>
    </div>
  )
}