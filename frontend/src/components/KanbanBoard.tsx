import { useMemo, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ExecutionStatus } from '@/lib/fleetTypes'
import type { ProjectDetail, ProjectPhase, ProjectTask, TrackStatus } from '@/lib/fleetTypes'
import { cn } from '@/lib/utils'

type BoardColumn = {
  key: BoardStatus
  label: string
  description: string
  accent: string
  statuses: string[]
}

export type BoardStatus = 'todo' | 'active' | 'blocked' | 'done'

const columns: BoardColumn[] = [
  {
    key: 'todo',
    label: 'Ready',
    description: 'Queued for orchestration.',
    accent: 'border-t-8 border-t-secondary',
    statuses: ['todo', 'ready'],
  },
  {
    key: 'active',
    label: 'Live',
    description: 'Currently running.',
    accent: 'border-t-8 border-t-primary',
    statuses: ['in_progress'],
  },
  {
    key: 'blocked',
    label: 'Stuck',
    description: 'Needs intervention.',
    accent: 'border-t-8 border-t-destructive',
    statuses: ['blocked'],
  },
  {
    key: 'done',
    label: 'Pass',
    description: 'Mission complete.',
    accent: 'border-t-8 border-t-accent',
    statuses: ['done'],
  },
]

export type BoardTask = ProjectTask & {
  trackName: string
  trackId: string
  trackStatus: TrackStatus | string
  phaseName: string
  status: BoardStatus
}

function mapToBoardStatus(taskStatus: string): BoardStatus | null {
  for (const col of columns) {
    if (col.statuses.includes(taskStatus)) return col.key
  }
  return null
}

function flattenBoardTasks(project: ProjectDetail, activeTrackId: string | null): BoardTask[] {
  const tracks = activeTrackId
    ? (project.tracks ?? []).filter(t => t.id === activeTrackId)
    : (project.tracks ?? [])

  return tracks.flatMap(track =>
    (track.phases ?? []).flatMap(phase =>
      (phase.tasks ?? [])
        .map(task => {
          const boardStatus = mapToBoardStatus(task.status)
          if (!boardStatus) return null
          return {
            ...task,
            trackName: track.name,
            trackId: track.id,
            trackStatus: track.status,
            phaseName: phase.name,
            status: boardStatus,
          }
        })
        .filter((t): t is BoardTask => t !== null),
    ),
  )
}

function taskPriorityClass(status: BoardStatus) {
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
              {task.status.toUpperCase()}
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

  return (
    <div className="relative group">
      {card}
      <Link
        to={`/tasks/${encodeURIComponent(task.id)}/timeline`}
        className="absolute top-2 right-2 bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest hover:bg-secondary hover:text-secondary-foreground transition-colors"
        title="View Timeline"
      >
        TL
      </Link>
    </div>
  )
}

function PhaseProgress({ phase }: { phase: ProjectPhase }) {
  if (phase.taskCount === 0) return null
  const pct = phase.doneCount / phase.taskCount
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-sm overflow-hidden">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${Math.round(pct * 100)}%` }}
        />
      </div>
      <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
        {phase.doneCount}/{phase.taskCount}
      </span>
    </div>
  )
}

function TrackAccordion({
  track,
  isExpanded,
  onToggle,
}: {
  track: ProjectDetail['tracks'][0]
  isExpanded: boolean
  onToggle: () => void
}) {
  const totalTasks = track.phases.reduce((s, p) => s + p.taskCount, 0)
  const doneTasks = track.phases.reduce((s, p) => s + p.doneCount, 0)

  const statusLabel: Record<string, string> = {
    complete: 'COMPLETE',
    active: 'ACTIVE',
    blocked: 'BLOCKED',
    new: 'BACKLOG',
    archived: 'ARCHIVED',
  }

  const statusColor: Record<string, string> = {
    complete: 'bg-accent text-accent-foreground',
    active: 'bg-primary text-primary-foreground',
    blocked: 'bg-destructive text-destructive-foreground',
    new: 'bg-secondary text-secondary-foreground',
    archived: 'bg-muted text-muted-foreground',
  }

  return (
    <div className="border-4 border-border">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 p-4 bg-muted/30 hover:bg-muted/60 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span
            className={cn(
              'font-black px-2 py-0.5 text-[10px] uppercase tracking-widest shrink-0',
              statusColor[track.status] ?? statusColor.new,
            )}
          >
            {statusLabel[track.status] ?? String(track.status).toUpperCase()}
          </span>
          <span className="text-sm font-bold truncate">{track.name}</span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <span className="text-xs font-bold text-muted-foreground tabular-nums">
            {doneTasks}/{totalTasks}
          </span>
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </button>
      {isExpanded && (
        <div className="p-4 space-y-3 bg-background/40">
          {track.phases.map(phase => (
            <div key={phase.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {phase.name}
                </span>
                <PhaseProgress phase={phase} />
              </div>
              <div className="flex flex-wrap gap-1">
                {phase.tasks.map(task => {
                  const boardStatus = mapToBoardStatus(task.status)
                  const colorMap: Record<string, string> = {
                    todo: 'bg-secondary text-secondary-foreground',
                    ready: 'bg-secondary text-secondary-foreground',
                    in_progress: 'bg-primary text-primary-foreground',
                    blocked: 'bg-destructive text-destructive-foreground',
                    done: 'bg-accent text-accent-foreground',
                  }
                  return (
                    <span
                      key={task.id}
                      className={cn(
                        'px-2 py-0.5 text-[10px] font-black uppercase tracking-widest',
                        colorMap[task.status] ?? colorMap.todo,
                      )}
                      title={task.description}
                    >
                      {boardStatus === 'done' ? '✓' : boardStatus === 'blocked' ? '✗' : '○'}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
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
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null)
  const [expandedBacklogIds, setExpandedBacklogIds] = useState<Set<string>>(new Set())

  const tracks = project.tracks ?? []

  const sortedTracks = useMemo(() => {
    const order: Record<string, number> = {
      active: 0,
      blocked: 1,
      new: 2,
      complete: 3,
      archived: 4,
    }
    return [...tracks].sort((a, b) => (order[a.status] ?? 5) - (order[b.status] ?? 5))
  }, [tracks])

  const selectedTrackId = useMemo(() => {
    if (activeTrackId) return activeTrackId
    const activeTrack = sortedTracks.find(t => t.status === 'active' || t.status === 'blocked')
    return activeTrack?.id ?? sortedTracks[0]?.id ?? null
  }, [activeTrackId, sortedTracks])

  const activeTrack = tracks.find(t => t.id === selectedTrackId) ?? null

  const boardTasks = useMemo(
    () => flattenBoardTasks(project, selectedTrackId),
    [project, selectedTrackId],
  )

  const grouped = useMemo(
    () =>
      Object.fromEntries(
        columns.map(column => [
          column.key,
          boardTasks.filter(task => mapToBoardStatus(task.status) === column.key),
        ]),
      ) as Record<BoardStatus, BoardTask[]>,
    [boardTasks],
  )

  const backlogTracks = sortedTracks.filter(t => t.id !== selectedTrackId)

  const toggleBacklogTrack = (trackId: string) => {
    setExpandedBacklogIds(prev => {
      const next = new Set(prev)
      if (next.has(trackId)) next.delete(trackId)
      else next.add(trackId)
      return next
    })
  }

  const handleDrop = (status: BoardStatus) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const taskId = event.dataTransfer.getData('text/plain')
    setDragOverStatus(null)
    setDraggedTaskId(null)

    if (!taskId || !onMoveTask) {
      return
    }

    const task = boardTasks.find(item => item.id === taskId)
    if (!task || task.status === status) {
      return
    }

    onMoveTask(taskId, status)
  }

  const activeTrackPhases = activeTrack?.phases ?? []
  const activeTrackDone = activeTrackPhases.reduce((s, p) => s + p.doneCount, 0)
  const activeTrackTotal = activeTrackPhases.reduce((s, p) => s + p.taskCount, 0)

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-4 border-border pb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              CURRENT_SPRINT
            </p>
            <select
              value={selectedTrackId ?? ''}
              onChange={e => setActiveTrackId(e.target.value || null)}
              className="bg-background border-4 border-border text-3xl font-black italic tracking-tighter px-2 py-1 focus:ring-4 focus:ring-primary focus:outline-none"
            >
              {sortedTracks.map(track => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </select>
          </div>
          {activeTrack ? (
            <div className="flex gap-4 items-center">
              <span
                className={cn(
                  'font-black px-3 py-1 text-xs uppercase tracking-widest',
                  activeTrack.status === 'active' && 'bg-primary text-primary-foreground',
                  activeTrack.status === 'blocked' && 'bg-destructive text-destructive-foreground',
                  activeTrack.status === 'complete' && 'bg-accent text-accent-foreground',
                  activeTrack.status === 'new' && 'bg-secondary text-secondary-foreground',
                )}
              >
                {String(activeTrack.status).toUpperCase()}
              </span>
              <span className="text-sm font-bold text-muted-foreground tabular-nums">
                {activeTrackDone}/{activeTrackTotal} COMPLETE
              </span>
            </div>
          ) : null}
        </div>
        {activeTrackPhases.length > 1 && (
          <div className="space-y-2">
            {activeTrackPhases.map(phase => (
              <PhaseProgress key={phase.name} phase={phase} />
            ))}
          </div>
        )}
      </div>

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

      {backlogTracks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 border-b-4 border-border pb-2">
            <h2 className="text-2xl font-black italic tracking-tighter">BACKLOG</h2>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              {backlogTracks.length} TRACK{backlogTracks.length === 1 ? '' : 'S'}
            </span>
          </div>
          <div className="space-y-2">
            {backlogTracks.map(track => (
              <TrackAccordion
                key={track.id}
                track={track}
                isExpanded={expandedBacklogIds.has(track.id)}
                onToggle={() => toggleBacklogTrack(track.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
