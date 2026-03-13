import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Play } from 'lucide-react'
import { statusFromMarker } from '../../../shared/board'
import type { BoardTask, TaskMarker, TaskStatus } from '../../../shared/board'
import type { AgentTemplate } from '../../../shared/agent-templates'
import type { ScheduleState } from '../../../shared/schedule-config'

interface ScheduleInfo {
  id: string
  taskId: string
  status: ScheduleState
  nextExecutionTime?: number
}

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
const AGENT_RE = /@(?<agent>[\w-]+)$/
const SCHEDULE_TAG_RE = /#schedule:[^\s]+/
const SCHEDULE_MODE_RE = /#schedule:([a-z-]+)/
const SCHEDULE_TIME_RE = /#schedule:[a-z-]+,(?:(delay):)?(\d+)([smh])/

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

function getAgentFromTitle(title: string): string {
  const match = title.match(AGENT_RE)
  return match?.groups?.agent ?? ''
}

function getScheduleModeFromTitle(title: string): string {
  const match = title.match(SCHEDULE_MODE_RE)
  return match?.[1] ?? ''
}

function getScheduleTimeFromTitle(title: string): { value: number; unit: string } | null {
  const match = title.match(SCHEDULE_TIME_RE)
  if (!match) return null
  return { value: parseInt(match[2], 10), unit: match[3] }
}

function hasDelayFormat(title: string): boolean {
  const match = title.match(SCHEDULE_TIME_RE)
  return match?.[1] === 'delay'
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
  onEditTaskTitle?: (payload: { phaseIndex: number; taskIndex: number; nextTitle: string }) => void
  onEditSubTaskTitle?: (payload: {
    phaseIndex: number
    taskIndex: number
    subTaskIndex: number
    nextTitle: string
  }) => void
  onRunAgent?: (payload: { phaseTitle: string; taskTitle: string; agentName: string }) => void
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
  onRunAgent,
}: PlanDetailPanelProps) {
  const [templates, setTemplates] = useState<AgentTemplate[]>([])
  const [scheduleInfos, setScheduleInfos] = useState<Map<string, ScheduleInfo>>(new Map())

  useEffect(() => {
    if (!window.settingsApi) return
    window.settingsApi.getAgentTemplates().then(res => {
      if (res.ok) setTemplates(res.templates)
    })
  }, [])

  useEffect(() => {
    if (!window.scheduleApi) return
    const fetchSchedules = async () => {
      const res = await window.scheduleApi!.getAll()
      if (res.ok) {
        const map = new Map<string, ScheduleInfo>()
        for (const s of res.schedules) {
          map.set(s.taskId, s)
        }
        setScheduleInfos(map)
      }
    }
    fetchSchedules()
    const interval = setInterval(fetchSchedules, 5000)
    return () => clearInterval(interval)
  }, [])

  const formatCountdown = (nextTime: number): string => {
    const diff = Math.max(0, nextTime - Date.now())
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    if (hours > 0) return `${hours}h ${minutes}m`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }

  const getScheduleInfoForTask = (taskId: string): ScheduleInfo | undefined => {
    return scheduleInfos.get(taskId)
  }

  const phases = useMemo(() => {
    if (!planContents) {
      return []
    }
    const parsed = parsePlanForDetail(planContents)
    const phase =
      parsed.find(
        entry => entry.title === task.phase && entry.tasks.some(item => item.title === task.title),
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

  const handleAgentChange = (
    newAgent: string,
    currentTitle: string,
    callback: (nextTitle: string) => void,
  ) => {
    const cleanTitle = currentTitle.replace(AGENT_RE, '').trim()
    const nextTitle = newAgent ? `${cleanTitle} @${newAgent}` : cleanTitle
    callback(nextTitle)
  }

  const handleScheduleModeChange = (
    newMode: string,
    currentTitle: string,
    callback: (nextTitle: string) => void,
  ) => {
    const cleanTitle = currentTitle.replace(SCHEDULE_TAG_RE, '').trim()
    const nextTitle = newMode ? `${cleanTitle} #schedule:${newMode}` : cleanTitle
    callback(nextTitle)
  }

  const handleScheduleTimeChange = (
    value: number,
    unit: string,
    currentTitle: string,
    callback: (nextTitle: string) => void,
  ) => {
    const mode = getScheduleModeFromTitle(currentTitle)
    const cleanTitle = currentTitle.replace(SCHEDULE_TAG_RE, '').trim()
    const usesDelayPrefix = mode === 'one-time' || mode === 'loop'
    const timeSuffix = usesDelayPrefix ? `delay:${value}${unit}` : `${value}${unit}`
    const nextTitle = `${cleanTitle} #schedule:${mode},${timeSuffix}`
    callback(nextTitle)
  }

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
          {error ? <p className="mt-2 text-xs text-destructive">Plan error: {error}</p> : null}
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
                            className="flex items-center gap-2"
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
                            <select
                              value={getAgentFromTitle(taskItem.title)}
                              onChange={e =>
                                handleAgentChange(e.target.value, taskItem.title, nextTitle =>
                                  onEditTaskTitle?.({
                                    phaseIndex: phase.index,
                                    taskIndex: taskItem.index,
                                    nextTitle,
                                  }),
                                )
                              }
                              aria-label={`Select agent for ${taskItem.title}`}
                              className="h-6 max-w-[80px] rounded border border-border bg-background px-1 text-[10px]"
                            >
                              <option value="">Agent</option>
                              {templates.map(t => (
                                <option key={t.name} value={t.name}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                            <select
                              value={getScheduleModeFromTitle(taskItem.title)}
                              onChange={e =>
                                handleScheduleModeChange(
                                  e.target.value,
                                  taskItem.title,
                                  nextTitle =>
                                    onEditTaskTitle?.({
                                      phaseIndex: phase.index,
                                      taskIndex: taskItem.index,
                                      nextTitle,
                                    }),
                                )
                              }
                              aria-label={`Select schedule mode for ${taskItem.title}`}
                              className="h-6 max-w-[80px] rounded border border-border bg-background px-1 text-[10px]"
                            >
                              <option value="">Schedule</option>
                              <option value="one-time">One-time</option>
                              <option value="interval">Interval</option>
                              <option value="loop">Loop</option>
                            </select>
                            {(() => {
                              const mode = getScheduleModeFromTitle(taskItem.title)
                              if (!mode) return null
                              if (mode === 'one-time' && !hasDelayFormat(taskItem.title))
                                return null
                              const isDelay = mode === 'one-time' || mode === 'loop'
                              const valueLabel = isDelay ? 'Delay' : 'Interval'
                              return (
                                <>
                                  <input
                                    type="number"
                                    min="1"
                                    value={getScheduleTimeFromTitle(taskItem.title)?.value ?? 1}
                                    onChange={e =>
                                      handleScheduleTimeChange(
                                        parseInt(e.target.value, 10) || 1,
                                        getScheduleTimeFromTitle(taskItem.title)?.unit ?? 'm',
                                        taskItem.title,
                                        nextTitle =>
                                          onEditTaskTitle?.({
                                            phaseIndex: phase.index,
                                            taskIndex: taskItem.index,
                                            nextTitle,
                                          }),
                                      )
                                    }
                                    aria-label={`${valueLabel} value for ${taskItem.title}`}
                                    className="h-6 w-12 rounded border border-border bg-background px-1 text-[10px]"
                                  />
                                  <select
                                    value={getScheduleTimeFromTitle(taskItem.title)?.unit ?? 'm'}
                                    onChange={e =>
                                      handleScheduleTimeChange(
                                        getScheduleTimeFromTitle(taskItem.title)?.value ?? 1,
                                        e.target.value,
                                        taskItem.title,
                                        nextTitle =>
                                          onEditTaskTitle?.({
                                            phaseIndex: phase.index,
                                            taskIndex: taskItem.index,
                                            nextTitle,
                                          }),
                                      )
                                    }
                                    aria-label={`${valueLabel} unit for ${taskItem.title}`}
                                    className="h-6 max-w-[50px] rounded border border-border bg-background px-1 text-[10px]"
                                  >
                                    <option value="s">s</option>
                                    <option value="m">m</option>
                                    <option value="h">h</option>
                                  </select>
                                </>
                              )
                            })()}
                            {(() => {
                              const scheduleMode = getScheduleModeFromTitle(taskItem.title)
                              if (!scheduleMode) return null
                              const scheduleInfo = getScheduleInfoForTask(task.id)
                              if (!scheduleInfo) return null
                              return (
                                <div className="flex items-center gap-2">
                                  <span
                                    data-testid="schedule-status-badge"
                                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                      scheduleInfo.status === 'running'
                                        ? 'bg-green-100 text-green-800'
                                        : scheduleInfo.status === 'paused'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : scheduleInfo.status === 'pending'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {scheduleInfo.status}
                                  </span>
                                  {scheduleInfo.nextExecutionTime ? (
                                    <span
                                      data-testid="schedule-countdown"
                                      className="text-[10px] text-muted-foreground"
                                    >
                                      {formatCountdown(scheduleInfo.nextExecutionTime)}
                                    </span>
                                  ) : null}
                                </div>
                              )
                            })()}
                            {getAgentFromTitle(taskItem.title) ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() =>
                                  onRunAgent?.({
                                    phaseTitle: phase.title,
                                    taskTitle: taskItem.title,
                                    agentName: getAgentFromTitle(taskItem.title),
                                  })
                                }
                                aria-label={`Run agent for ${taskItem.title}`}
                              >
                                <Play className="h-3 w-3" />
                              </Button>
                            ) : null}
                          </div>
                          {taskItem.subTasks.length > 0 ? (
                            <div
                              className="space-y-1 pl-4"
                              data-testid={`plan-subtask-group-${phase.index}-${taskItem.index}`}
                            >
                              {taskItem.subTasks.map((subTask, subTaskIndex) => (
                                <div
                                  key={`subtask-${phase.index}-${taskItem.index}-${subTask.index}`}
                                  className="flex items-center gap-2"
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
                                  <select
                                    value={getAgentFromTitle(subTask.title)}
                                    onChange={e =>
                                      handleAgentChange(e.target.value, subTask.title, nextTitle =>
                                        onEditSubTaskTitle?.({
                                          phaseIndex: phase.index,
                                          taskIndex: taskItem.index,
                                          subTaskIndex: subTask.index,
                                          nextTitle,
                                        }),
                                      )
                                    }
                                    aria-label={`Select agent for ${subTask.title}`}
                                    className="h-6 max-w-[80px] rounded border border-border bg-background px-1 text-[10px]"
                                  >
                                    <option value="">Agent</option>
                                    {templates.map(t => (
                                      <option key={t.name} value={t.name}>
                                        {t.name}
                                      </option>
                                    ))}
                                  </select>
                                  {getAgentFromTitle(subTask.title) ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 shrink-0"
                                      onClick={() =>
                                        onRunAgent?.({
                                          phaseTitle: phase.title,
                                          taskTitle: subTask.title,
                                          agentName: getAgentFromTitle(subTask.title),
                                        })
                                      }
                                      aria-label={`Run agent for ${subTask.title}`}
                                    >
                                      <Play className="h-3 w-3" />
                                    </Button>
                                  ) : null}
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
