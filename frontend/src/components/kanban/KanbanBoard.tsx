import { useState, type DragEvent } from 'react'

import { KanbanColumn, COLUMNS } from './KanbanColumn'
import { TaskCard } from './TaskCard'
import type { KanbanTask } from '@/hooks/useKanbanBoard'
import { isValidStatusTransition } from '@/lib/kanban'

export type KanbanBoardProps = {
  tasks: KanbanTask[]
  onMoveTask: (taskId: string, newStatus: string) => void
  onTaskClick?: (taskId: string) => void
  onUnblock?: (taskId: string) => void
  pendingTaskId?: string | null
}

/**
 * Drag-and-drop kanban board with columns and task cards
 */
export function KanbanBoard({
  tasks,
  onMoveTask,
  onTaskClick,
  onUnblock,
  pendingTaskId,
}: KanbanBoardProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  const grouped = Object.fromEntries(
    COLUMNS.map(col => [col.key, tasks.filter(t => t.status === col.key)]),
  ) as Record<string, KanbanTask[]>

  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId)
  }

  const handleDragEnd = () => {
    setDraggedTaskId(null)
    setDragOverColumn(null)
  }

  const handleDrop = (columnKey: string) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    setDragOverColumn(null)
    setDraggedTaskId(null)

    if (!taskId) return

    const task = tasks.find(t => t._id === taskId)
    if (!task || task.status === columnKey) return

    if (!isValidStatusTransition(task.status, columnKey)) return

    onMoveTask(taskId, columnKey)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {COLUMNS.map(column => (
        <KanbanColumn
          key={column.key}
          column={column}
          tasks={grouped[column.key]}
          isDragOver={dragOverColumn === column.key}
          onDragOver={e => {
            e.preventDefault()
            setDragOverColumn(column.key)
          }}
          onDragLeave={() => {
            setDragOverColumn(current => (current === column.key ? null : current))
          }}
          onDrop={handleDrop(column.key)}
        >
          {grouped[column.key].length === 0 ? (
            <div className="border-2 border-dashed border-[#23252a] rounded-lg px-4 py-12 text-center">
              <span className="text-xs font-medium text-[#62666d]">No tasks</span>
            </div>
          ) : (
            grouped[column.key].map(task => (
              <div
                key={task._id}
                onDragStart={() => handleDragStart(task._id)}
                onDragEnd={handleDragEnd}
              >
                <TaskCard
                  task={task}
                  isDragging={draggedTaskId === task._id}
                  isPending={pendingTaskId === task._id}
                  onClick={onTaskClick ? () => onTaskClick(task._id) : undefined}
                  onUnblock={onUnblock}
                />
              </div>
            ))
          )}
        </KanbanColumn>
      ))}
    </div>
  )
}
