import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { statusFromMarker } from '../../../shared/board'
import type { BoardTask, TaskMarker, TaskStatus } from '../../../shared/board'

interface PlanTask {
  title: string
  marker: TaskMarker
  status: TaskStatus
  phase: string
  subTasks: PlanSubTask[]
  index: number
}

interface PlanPhase {
  title: string
  tasks: PlanTask[]
  index: number
}

interface PlanSubTask {
  title: string
  marker: TaskMarker
  status: TaskStatus
  index: number
}

const PHASE_RE = /^##\s+(?<title>.*)$/
const TASK_RE = /^-\s*\[(?<marker>[ xX~])\]\s*Task:\s*(?<title>.*)$/
const CHECKLIST_RE = /^-\s*\[(?<marker>[ xX~])\]\s*(?<title>.*)$/
const CHECKPOINT_RE = /\s*\[checkpoint:[^\]]+\]\s*$/i

function markerFromChar(char: string): TaskMarker | null {
  const normalized = char.trim().toLowerCase()
  if (normalized === '') {
    return '[ ]'
  }
  switch (normalized) {
    case 'x':
      return '[x]'
    case '~':
      return '[~]'
    default:
      return null
  }
}

function normalizePhaseTitle(title: string): string {
  return title.replace(CHECKPOINT_RE, '')
}

export function parsePlanForDetail(contents: string): PlanPhase[] {
  const lines = contents.split(/\r?\n/)
  const phases: PlanPhase[] = []
  let currentPhase: PlanPhase | null = null
  let currentTask: PlanTask | null = null
  let phaseIndex = -1
  let taskIndex = -1
  let subTaskIndex = -1

  for (const rawLine of lines) {
    const line = rawLine.trimStart()
    const indentLength = rawLine.length - line.length
    const hasIndent = indentLength > 0
    const phaseMatch = line.match(PHASE_RE)
    if (phaseMatch?.groups?.title !== undefined) {
      const title = normalizePhaseTitle(phaseMatch.groups.title)
      phaseIndex += 1
      currentPhase = { title, tasks: [], index: phaseIndex }
      phases.push(currentPhase)
      currentTask = null
      taskIndex = -1
      subTaskIndex = -1
      continue
    }

    const taskMatch = line.match(TASK_RE)
    if (!taskMatch?.groups || !currentPhase) {
      const subTaskMatch = line.match(CHECKLIST_RE)
      if (!subTaskMatch?.groups || !currentPhase || !currentTask || !hasIndent) {
        continue
      }

      const marker = markerFromChar(subTaskMatch.groups.marker ?? '')
      if (!marker) {
        continue
      }

      const title = subTaskMatch.groups.title ?? ''
      subTaskIndex += 1
      currentTask.subTasks.push({
        title,
        marker,
        status: statusFromMarker(marker),
        index: subTaskIndex,
      })
      continue
    }

    const marker = markerFromChar(taskMatch.groups.marker ?? '')
    if (!marker) {
      continue
    }

    const title = taskMatch.groups.title ?? ''
    taskIndex += 1
    subTaskIndex = -1
    currentTask = {
      title,
      marker,
      status: statusFromMarker(marker),
      phase: currentPhase.title,
      subTasks: [],
      index: taskIndex,
    }
    currentPhase.tasks.push(currentTask)
  }

  return phases
}

interface PlanDetailPanelProps {
  task: BoardTask
  onClose: () => void
  planContents?: string | null
  isLoading?: boolean
  error?: string | null
  onToggleTask?: (payload: {
    phaseTitle: string
    taskTitle: string
    currentStatus: TaskStatus
  }) => void
  onToggleSubTask?: (payload: {
    phaseIndex: number
    taskIndex: number
    subTaskIndex: number
    phaseTitle: string
    taskTitle: string
    subTaskTitle: string
    currentStatus: TaskStatus
  }) => void
  onEditPhaseTitle?: (payload: { phaseIndex: number; nextTitle: string }) => void
  onEditTaskTitle?: (payload: {
    phaseIndex: number
    taskIndex: number
    nextTitle: string
  }) => void
  onEditSubTaskTitle?: (payload: {
    phaseIndex: number
    taskIndex: number
    subTaskIndex: number
    nextTitle: string
  }) => void
}

export function PlanDetailPanel({
  task,
  onClose,
  planContents = null,
  isLoading = false,
  error = null,
  onToggleTask,
  onToggleSubTask,
  onEditPhaseTitle,
  onEditTaskTitle,
  onEditSubTaskTitle,
}: PlanDetailPanelProps) {
  const phases = useMemo(() => {
    if (!planContents) {
      return []
    }
    const parsed = parsePlanForDetail(planContents)
    const phase =
      parsed.find(
        entry =>
          entry.title === task.phase &&
          entry.tasks.some(item => item.title === task.title),
      ) ?? parsed.find(entry => entry.tasks.some(item => item.title === task.title))
    if (!phase) {
      return []
    }
    const taskEntry = phase.tasks.find(entry => entry.title === task.title)
    if (!taskEntry) {
      return []
    }
    return [{ ...phase, tasks: [taskEntry] }]
  }, [planContents, task.phase, task.title])

  return (
    <aside
      className="flex h-full w-96 flex-col border-l border-border bg-muted/30 animate-in slide-in-from-right-6 duration-200"
      data-testid="plan-detail-panel"
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="space-y-1">
          <p className="text-xs uppercase text-muted-foreground">Plan Detail</p>
          <h2 className="text-sm font-semibold text-foreground">{task.trackTitle}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </header>
      <div className="flex-1 space-y-4 overflow-auto px-4 py-4">
        <div>
          <p className="text-[11px] uppercase text-muted-foreground">Task</p>
          <p className="mt-1 font-mono text-sm text-foreground">{task.title}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{task.phase}</p>
        </div>
        <div className="space-y-3 rounded border border-dashed border-border bg-background/60 p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Plan Content</p>
          {isLoading ? (
            <p className="mt-2 font-mono text-xs text-muted-foreground">Loading plan...</p>
          ) : null}
          {error ? (
            <p className="mt-2 text-xs text-destructive">Plan error: {error}</p>
          ) : null}
          {!isLoading && !error ? (
            phases.length > 0 ? (
              <div className="space-y-4">
                {phases.map(phase => (
                  <div key={`phase-${phase.index}`} className="space-y-2">
                    <input
                      value={phase.title}
                      onChange={event =>
                        onEditPhaseTitle?.({
                          phaseIndex: phase.index,
                          nextTitle: event.target.value,
                        })
                      }
                      onFocus={event => event.currentTarget.select()}
                      aria-label={`Edit phase ${phase.title}`}
                      className="w-full bg-transparent text-xs font-semibold text-foreground"
                    />
                    <div className="space-y-2">
                      {phase.tasks.map((taskItem, taskIndex) => (
                        <div
                          key={`task-${phase.index}-${taskItem.index}`}
                          className="space-y-1"
                          data-testid={`plan-task-group-${phase.index}-${taskItem.index}`}
                        >
                          <div
                            className="flex gap-2"
                            data-testid={`plan-task-row-${phase.index}-${taskItem.index}`}
                          >
                            <button
                              type="button"
                              className="font-mono text-xs text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                onToggleTask?.({
                                  phaseTitle: phase.title,
                                  taskTitle: taskItem.title,
                                  currentStatus: taskItem.status,
                                })
                              }
                              aria-label={`Toggle ${taskItem.title}`}
                            >
                              {taskItem.marker}
                            </button>
                            <input
                              value={taskItem.title}
                              onChange={event =>
                                onEditTaskTitle?.({
                                  phaseIndex: phase.index,
                                  taskIndex: taskItem.index,
                                  nextTitle: event.target.value,
                                })
                              }
                              onFocus={event => event.currentTarget.select()}
                              aria-label={`Edit task ${taskItem.title}`}
                              className="w-full bg-transparent text-xs text-foreground"
                            />
                          </div>
                          {taskItem.subTasks.length > 0 ? (
                            <div
                              className="space-y-1 pl-4"
                              data-testid={`plan-subtask-group-${phase.index}-${taskItem.index}`}
                            >
                              {taskItem.subTasks.map((subTask, subTaskIndex) => (
                                <div
                                  key={`subtask-${phase.index}-${taskItem.index}-${subTask.index}`}
                                  className="flex gap-2"
                                  data-testid={`plan-subtask-row-${phase.index}-${taskItem.index}-${subTask.index}`}
                                >
                                  <button
                                    type="button"
                                    className="font-mono text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() =>
                                      onToggleSubTask?.({
                                        phaseIndex: phase.index,
                                        taskIndex: taskItem.index,
                                        subTaskIndex: subTask.index,
                                        phaseTitle: phase.title,
                                        taskTitle: taskItem.title,
                                        subTaskTitle: subTask.title,
                                        currentStatus: subTask.status,
                                      })
                                    }
                                    aria-label={`Toggle sub-task ${subTask.title}`}
                                  >
                                    {subTask.marker}
                                  </button>
                                  <input
                                    value={subTask.title}
                                    onChange={event =>
                                      onEditSubTaskTitle?.({
                                        phaseIndex: phase.index,
                                        taskIndex: taskItem.index,
                                        subTaskIndex: subTask.index,
                                        nextTitle: event.target.value,
                                      })
                                    }
                                    onFocus={event => event.currentTarget.select()}
                                    aria-label={`Edit sub-task ${subTask.title}`}
                                    className="w-full bg-transparent text-xs text-foreground"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                Plan content will appear here once loaded.
              </p>
            )
          ) : null}
        </div>
      </div>
    </aside>
  )
}
