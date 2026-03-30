import { useMemo, useState, type DragEvent } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ExecutionStatus } from '@/lib/fleetTypes'
import { cn } from '@/lib/utils'
import type { ProjectDetail, ProjectTask } from '@/lib/fleetTypes'

type BoardColumn = {
  key: BoardStatus
  label: string
  description: string
  accent: string
}

const boardStatuses = ['todo', 'active', 'blocked', 'done'] as const

export type BoardStatus = (typeof boardStatuses)[number]

const columns: BoardColumn[] = [
  {
    key: 'todo',
    label: 'Ready / Todo',
    description: 'Queued work waiting for the next orchestration run.',
    accent: 'border-sky-400/20 bg-sky-400/5 text-sky-100',
  },
  {
    key: 'active',
    label: 'In Progress',
    description: 'Tasks currently marked as active in the plan.',
    accent: 'border-amber-400/20 bg-amber-400/5 text-amber-100',
  },
  {
    key: 'blocked',
    label: 'Blocked',
    description: 'Items waiting on a broker issue or upstream dependency.',
    accent: 'border-rose-400/30 bg-rose-400/10 text-rose-100',
  },
  {
    key: 'done',
    label: 'Done',
    description: 'Completed tasks already reflected in the plan.',
    accent: 'border-emerald-400/20 bg-emerald-400/5 text-emerald-100',
  },
]

export type BoardTask = ProjectTask & {
  trackName: string
  trackId: string
  phaseName: string
  status: BoardStatus
}

function isBoardStatus(status: ProjectTask['status']): status is BoardStatus {
  return boardStatuses.includes(status as BoardStatus)
}

function flattenProjectTasks(project: ProjectDetail) {
  return (project.tracks ?? []).flatMap(track =>
    (track.phases ?? []).flatMap(phase =>
      (phase.tasks ?? [])
        .filter(task => isBoardStatus(task.status))
        .map(task => ({
          ...task,
          trackName: track.name,
          trackId: track.id,
          phaseName: phase.name,
        })),
    ),
  )
}

function taskPriorityClass(status: ProjectTask['status']) {
  switch (status) {
    case 'blocked':
      return 'border-rose-500/40 bg-rose-500/10'
    case 'active':
      return 'border-amber-500/40 bg-amber-500/10'
    case 'done':
      return 'border-emerald-500/30 bg-emerald-500/10'
    default:
      return 'border-border/60 bg-background/60'
  }
}

function executionStatusBadge(status: ExecutionStatus) {
  switch (status.status) {
    case 'running':
      return {
        label: 'Running',
        className:
          'border-cyan-400/30 bg-cyan-400/10 text-cyan-100 animate-pulse',
      }
    case 'retrying':
      return {
        label: `Retry ${status.attempt}/${status.maxRetries}`,
        className: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
      }
    case 'succeeded':
      return {
        label: 'Done',
        className: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
      }
    case 'failed':
      return {
        label: 'Failed',
        className: 'border-rose-400/30 bg-rose-400/10 text-rose-100',
      }
    default:
      return null
  }
}

function TaskCard({
  task,
  isDragging,
  isPending,
  executionStatus,
  onClick,
}: {
  task: BoardTask
  isDragging: boolean
  isPending: boolean
  executionStatus?: ExecutionStatus
  onClick?: () => void
}) {
  const interactive = Boolean(onClick)

  const card = (
    <Card
      data-task-id={task.id}
      className={cn(
        'shadow-none active:cursor-grabbing',
        interactive && 'cursor-pointer transition hover:border-rose-300/60 hover:bg-rose-500/15',
        !interactive && 'cursor-grab',
        taskPriorityClass(task.status),
        isDragging && 'scale-[1.01] shadow-lg',
        isPending && 'opacity-70',
      )}
    >
      <CardHeader className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm leading-snug">{task.description}</CardTitle>
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full border border-border/60 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {task.status}
            </span>
            {interactive ? (
              <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-rose-100">
                Open issue
              </span>
            ) : null}
            {isPending ? (
              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                Saving
              </span>
            ) : null}
            {executionStatus ? (() => {
              const badge = executionStatusBadge(executionStatus)
              if (!badge) return null
              return (
                <span
                  className={cn(
                    'rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.18em]',
                    badge.className,
                  )}
                >
                  {badge.label}
                  {executionStatus.status === 'retrying' && executionStatus.delayMs
                    ? ` (${Math.round(executionStatus.delayMs / 1000)}s)`
                    : null}
                </span>
              )
            })() : null}
          </div>
        </div>
        <CardDescription className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-border/60 px-2 py-1">{task.trackName}</span>
          <span className="rounded-full border border-border/60 px-2 py-1">{task.phaseName}</span>
          {task.agentTag ? (
            <span className="rounded-full border border-border/60 px-2 py-1">@{task.agentTag}</span>
          ) : null}
        </CardDescription>
      </CardHeader>
    </Card>
  )

  if (interactive) {
    return (
      <button
        type="button"
        data-task-id={task.id}
        onClick={onClick}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {card}
      </button>
    )
  }

  return card
}

export function KanbanBoard({
  project,
  onMoveTask,
  pendingTaskId,
  onBlockedTaskSelect,
  getTaskStatus,
}: {
  project: ProjectDetail
  onMoveTask?: (taskId: string, nextStatus: BoardStatus) => void
  pendingTaskId?: string | null
  onBlockedTaskSelect?: (task: BoardTask) => void
  getTaskStatus?: (taskId: string) => ExecutionStatus | undefined
}) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<BoardStatus | null>(null)

  const tasks = flattenProjectTasks(project)
  const grouped = useMemo(
    () =>
      Object.fromEntries(
        columns.map(column => [column.key, tasks.filter(task => task.status === column.key)]),
      ) as Record<BoardStatus, BoardTask[]>,
    [tasks],
  )

  const handleDrop = (status: BoardStatus) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const taskId = event.dataTransfer.getData('text/plain')
    setDragOverStatus(null)
    setDraggedTaskId(null)

    if (!taskId || !onMoveTask) {
      return
    }

    const task = tasks.find(item => item.id === taskId)
    if (!task || task.status === status) {
      return
    }

    onMoveTask(taskId, status)
  }

  return (
    <section className="grid gap-4 xl:grid-cols-4">
      {columns.map(column => (
        <Card
          key={column.key}
          data-status-column={column.key}
          onDragOver={event => {
            event.preventDefault()
            setDragOverStatus(column.key)
          }}
          onDragLeave={() => {
            setDragOverStatus(current => (current === column.key ? null : current))
          }}
          onDrop={handleDrop(column.key)}
          className={cn(
            'border-border/60 bg-background/50 transition-colors',
            column.accent,
            dragOverStatus === column.key && 'ring-2 ring-cyan-400/50',
          )}
        >
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">{column.label}</CardTitle>
            <CardDescription>{column.description}</CardDescription>
            <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              {grouped[column.key].length} task{grouped[column.key].length === 1 ? '' : 's'}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {grouped[column.key].length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">
                Nothing in this lane.
              </div>
            ) : (
              grouped[column.key].map(task => (
                <div
                  key={task.id}
                  data-task-id={task.id}
                  draggable
                  onDragStart={event => {
                    event.dataTransfer.setData('text/plain', task.id)
                    event.dataTransfer.effectAllowed = 'move'
                    setDraggedTaskId(task.id)
                  }}
                  onDragEnd={() => {
                    setDraggedTaskId(null)
                    setDragOverStatus(null)
                  }}
                >
                  <TaskCard
                    task={task}
                    isDragging={draggedTaskId === task.id}
                    isPending={pendingTaskId === task.id}
                    executionStatus={getTaskStatus?.(task.id)}
                    onClick={
                      task.status === 'blocked' ? () => onBlockedTaskSelect?.(task) : undefined
                    }
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </section>
  )
}
