import { useMemo, useState } from 'react'
import type { BoardTask, TaskStatus, TaskActivity } from '../../../shared/board'

interface BoardViewProps {
  tasks: BoardTask[]
  isLoading?: boolean
  error?: string | null
  onTaskStatusChange?: (task: BoardTask, nextStatus: TaskStatus) => void
  onTaskSelect?: (task: BoardTask) => void
}

interface BoardColumn {
  key: TaskStatus
  title: string
}

const columns: BoardColumn[] = [
  { key: 'todo', title: 'To Do' },
  { key: 'in_progress', title: 'In Progress' },
  { key: 'done', title: 'Done' },
]

function formatActivity(activity: TaskActivity): string {
  const shortHash = activity.commitHash.slice(0, 7)
  return `Last activity: ${shortHash} · ${activity.timestamp}`
}

export function BoardView({
  tasks,
  isLoading = false,
  error = null,
  onTaskStatusChange,
  onTaskSelect,
}: BoardViewProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)

  const tasksById = useMemo(() => new Map(tasks.map(task => [task.id, task])), [tasks])

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading board...</div>
  }

  if (error) {
    return <div className="text-sm text-destructive">Failed to load board: {error}</div>
  }

  if (tasks.length === 0) {
    return <div className="text-sm text-muted-foreground">No tasks found.</div>
  }

  const tasksByStatus = columns.reduce<Record<TaskStatus, BoardTask[]>>(
    (acc, column) => {
      acc[column.key] = tasks.filter(task => task.status === column.key)
      return acc
    },
    {
      todo: [],
      in_progress: [],
      done: [],
    },
  )

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {columns.map(column => (
        <section
          key={column.key}
          className="rounded-lg border border-border bg-muted/20 p-4"
          data-testid={`column-${column.key}`}
          onDragOver={event => {
            if (draggedTaskId) {
              event.preventDefault()
            }
          }}
          onDrop={() => {
            if (!draggedTaskId) {
              return
            }
            const task = tasksById.get(draggedTaskId)
            if (!task || task.status === column.key) {
              setDraggedTaskId(null)
              return
            }
            if (typeof onTaskStatusChange === 'function') {
              onTaskStatusChange(task, column.key)
            }
            setDraggedTaskId(null)
          }}
        >
          <header className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {column.title}
            </h3>
            <span className="text-xs font-mono text-muted-foreground">
              {tasksByStatus[column.key].length}
            </span>
          </header>
          <div className="space-y-3">
            {tasksByStatus[column.key].map(task => (
              <article
                key={task.id}
                className={`rounded-md border border-border bg-background p-3 shadow-sm ${
                  onTaskStatusChange ? 'cursor-move' : ''
                }`}
                data-testid={`task-card-${task.id}`}
                draggable={Boolean(onTaskStatusChange)}
                onClick={() => onTaskSelect?.(task)}
                onDragStart={() => {
                  if (onTaskStatusChange) {
                    setDraggedTaskId(task.id)
                  }
                }}
                onDragEnd={() => setDraggedTaskId(null)}
              >
                <h4 className="text-sm font-semibold text-foreground">{task.title}</h4>
                <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                  <span className="font-mono">{task.trackTitle}</span>
                  <span className="font-mono">{task.phase}</span>
                  {task.statusSource === 'inferred' ? (
                    <span className="text-amber-500">Inferred</span>
                  ) : null}
                  {task.needsSync ? <span className="text-amber-500">Needs Sync</span> : null}
                  {task.activity ? (
                    <span className="font-mono">{formatActivity(task.activity)}</span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
