import { useMemo, useState, type DragEvent } from 'react'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    label: 'Ready',
    description: 'Queued for orchestration.',
    accent: 'border-t-8 border-t-secondary',
  },
  {
    key: 'active',
    label: 'Live',
    description: 'Currently running.',
    accent: 'border-t-8 border-t-primary',
  },
  {
    key: 'blocked',
    label: 'Stuck',
    description: 'Needs intervention.',
    accent: 'border-t-8 border-t-destructive',
  },
  {
    key: 'done',
    label: 'Pass',
    description: 'Mission complete.',
    accent: 'border-t-8 border-t-accent',
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
      return 'border-l-4 border-l-destructive'
    case 'active':
      return 'border-l-4 border-l-primary'
    case 'done':
      return 'border-l-4 border-l-accent'
    default:
      return 'border-l-4 border-l-secondary'
  }
}

function executionStatusBadge(status: ExecutionStatus) {
  switch (status.status) {
    case 'running':
      return {
        label: 'RUNNING',
        className: 'border-primary bg-primary text-primary-foreground',
      }
    case 'retrying':
      return {
        label: `RETRY ${status.attempt}`,
        className: 'border-secondary bg-secondary text-secondary-foreground',
      }
    case 'succeeded':
      return {
        label: 'DONE',
        className: 'border-accent bg-accent text-accent-foreground',
      }
    case 'failed':
      return {
        label: 'FAILED',
        className: 'border-destructive bg-destructive text-destructive-foreground',
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
        'active:cursor-grabbing border-4',
        interactive && 'cursor-pointer hover:border-primary',
        !interactive && 'cursor-grab',
        taskPriorityClass(task.status),
        isDragging && 'opacity-80 scale-95',
        isPending && 'opacity-70',
      )}
    >
      <CardHeader className="space-y-4 p-5">
        <div className="flex flex-col gap-3">
          <CardTitle className="text-lg leading-none tracking-tighter">
            {task.description}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <span className="bg-foreground text-background font-black px-2 py-0.5 text-[10px] uppercase tracking-widest">
              {task.status}
            </span>
            {interactive && task.status === 'blocked' ? (
              <span className="bg-destructive text-destructive-foreground font-black px-2 py-0.5 text-[10px] uppercase tracking-widest">
                BLOCKED
              </span>
            ) : null}
            {isPending ? (
              <span className="bg-secondary text-secondary-foreground font-black px-2 py-0.5 text-[10px] uppercase tracking-widest">
                SAVING
              </span>
            ) : null}
            {executionStatus
              ? (() => {
                  const badge = executionStatusBadge(executionStatus)
                  if (!badge) return null
                  return (
                    <span
                      className={cn(
                        'font-black px-2 py-0.5 text-[10px] uppercase tracking-widest',
                        badge.className,
                      )}
                    >
                      {badge.label}
                    </span>
                  )
                })()
              : null}
          </div>
        </div>
        <CardDescription className="flex flex-col gap-1 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
          <span>// {task.trackName}</span>
          <span>// {task.phaseName}</span>
          {task.agentTag ? <span className="text-primary">@ {task.agentTag}</span> : null}
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
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary"
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
  onDoneTaskSelect,
  getTaskStatus,
}: {
  project: ProjectDetail
  onMoveTask?: (taskId: string, nextStatus: BoardStatus) => void
  pendingTaskId?: string | null
  onBlockedTaskSelect?: (task: BoardTask) => void
  onDoneTaskSelect?: (task: BoardTask) => void
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
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-x-4 divide-border border-t-4 border-border">
      {columns.map(column => (
        <div
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
            'flex flex-col bg-background/50',
            column.accent,
            dragOverStatus === column.key && 'bg-secondary/10 ring-4 ring-inset ring-secondary',
          )}
        >
          <div className="p-6 border-b-4 border-border bg-muted/30">
            <div className="flex flex-col gap-1">
              <h2 className="text-4xl font-black tracking-tighter leading-none italic">
                {column.label}
              </h2>
              <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-muted-foreground">
                {column.description}
              </p>
            </div>
            <div className="mt-4 inline-block bg-primary text-primary-foreground px-3 py-1 text-xs font-black italic">
              {grouped[column.key].length} ITEM{grouped[column.key].length === 1 ? '' : 'S'}
            </div>
          </div>
          <div className="flex-1 p-5 space-y-6">
            {grouped[column.key].length === 0 ? (
              <div className="border-4 border-dashed border-border px-4 py-12 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground italic opacity-50">
                LANE_EMPTY
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
                      task.status === 'blocked'
                        ? () => onBlockedTaskSelect?.(task)
                        : task.status === 'done'
                          ? () => onDoneTaskSelect?.(task)
                          : undefined
                    }
                  />
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </section>
  )
}
