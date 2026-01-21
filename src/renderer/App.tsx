import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Settings,
  ListTodo,
  Terminal as TerminalIcon,
  Activity,
} from 'lucide-react'
import type { ProjectLoadResponse } from '../shared/board-data'
import { IPC_CHANNELS } from '../shared/ipc'
import { markerFromStatus } from '../shared/board'
import type { BoardTask, TaskStatus, TaskMarker } from '../shared/board'
import { BoardPanel } from './components/board/BoardPanel'
import { PlanDetailPanel, parsePlanForDetail } from './components/board/PlanDetailPanel'

const PHASE_RE = /^##\s+(?<title>.+?)\s*$/
const TASK_RE = /^(\-\s*\[[ xX~]\]\s*Task:\s*)(.*)$/
const CHECKPOINT_RE = /\s*\[checkpoint:[^\]]+\]\s*$/i
const SUB_TASK_RE = /^-\s*\[[ xX~]\]\s*(.*)$/

function nextStatusFromCurrent(status: TaskStatus): TaskStatus {
  return status === 'todo' ? 'in_progress' : status === 'in_progress' ? 'done' : 'todo'
}

function updatePhaseTitleAtIndex(
  contents: string,
  phaseIndex: number,
  nextTitle: string,
): string {
  const lines = contents.split(/\r?\n/)
  let currentPhaseIndex = -1
  const updated = lines.map(line => {
    const match = line.match(PHASE_RE)
    if (!match?.groups?.title) {
      return line
    }
    currentPhaseIndex += 1
    if (currentPhaseIndex !== phaseIndex) {
      return line
    }
    const rawTitle = match.groups.title
    const checkpointMatch = rawTitle.match(CHECKPOINT_RE)
    const checkpointSuffix = checkpointMatch ? ` ${checkpointMatch[0].trim()}` : ''
    return `## ${nextTitle}${checkpointSuffix}`
  })
  return updated.join('\n')
}

function updateTaskTitleAtIndex(
  contents: string,
  phaseIndex: number,
  taskIndex: number,
  nextTitle: string,
): string {
  const lines = contents.split(/\r?\n/)
  let currentPhaseIndex = -1
  let currentTaskIndex = -1
  const updated = lines.map(line => {
    const phaseMatch = line.match(PHASE_RE)
    if (phaseMatch?.groups?.title) {
      currentPhaseIndex += 1
      currentTaskIndex = -1
      return line
    }
    const taskMatch = line.match(TASK_RE)
    if (!taskMatch || currentPhaseIndex !== phaseIndex) {
      return line
    }
    currentTaskIndex += 1
    if (currentTaskIndex !== taskIndex) {
      return line
    }
    return `${taskMatch[1]}${nextTitle}`
  })
  return updated.join('\n')
}

function updateSubTaskMarkerAtIndex(
  contents: string,
  phaseIndex: number,
  taskIndex: number,
  subTaskIndex: number,
  nextMarker: TaskMarker,
): string {
  const lines = contents.split(/\r?\n/)
  let currentPhaseIndex = -1
  let currentTaskIndex = -1
  let currentSubTaskIndex = -1

  const updated = lines.map(line => {
    const trimmedLine = line.trimStart()
    const phaseMatch = trimmedLine.match(PHASE_RE)
    if (phaseMatch?.groups?.title) {
      currentPhaseIndex += 1
      currentTaskIndex = -1
      currentSubTaskIndex = -1
      return line
    }

    const taskMatch = trimmedLine.match(TASK_RE)
    if (taskMatch) {
      currentTaskIndex += 1
      currentSubTaskIndex = -1
      return line
    }

    const hasIndent = trimmedLine.length !== line.length
    const subTaskMatch = trimmedLine.match(SUB_TASK_RE)
    if (!hasIndent || !subTaskMatch) {
      return line
    }

    if (currentPhaseIndex !== phaseIndex || currentTaskIndex !== taskIndex) {
      return line
    }

    currentSubTaskIndex += 1
    if (currentSubTaskIndex !== subTaskIndex) {
      return line
    }

    return line.replace(/^(\s*-\s*)\[[ xX~]\]/, `$1${nextMarker}`)
  })

  return updated.join('\n')
}

function updateSubTaskTitleAtIndex(
  contents: string,
  phaseIndex: number,
  taskIndex: number,
  subTaskIndex: number,
  nextTitle: string,
): string {
  const lines = contents.split(/\r?\n/)
  let currentPhaseIndex = -1
  let currentTaskIndex = -1
  let currentSubTaskIndex = -1

  const updated = lines.map(line => {
    const trimmedLine = line.trimStart()
    const phaseMatch = trimmedLine.match(PHASE_RE)
    if (phaseMatch?.groups?.title) {
      currentPhaseIndex += 1
      currentTaskIndex = -1
      currentSubTaskIndex = -1
      return line
    }

    const taskMatch = trimmedLine.match(TASK_RE)
    if (taskMatch) {
      currentTaskIndex += 1
      currentSubTaskIndex = -1
      return line
    }

    const hasIndent = trimmedLine.length !== line.length
    const subTaskMatch = trimmedLine.match(SUB_TASK_RE)
    if (!hasIndent || !subTaskMatch) {
      return line
    }

    if (currentPhaseIndex !== phaseIndex || currentTaskIndex !== taskIndex) {
      return line
    }

    currentSubTaskIndex += 1
    if (currentSubTaskIndex !== subTaskIndex) {
      return line
    }

    return line.replace(/^(\s*-\s*\[[ xX~]\]\s*).*/, `$1${nextTitle}`)
  })

  return updated.join('\n')
}

function App() {
  const [activeTab, setActiveTab] = useState<'board' | 'tracks'>('board')
  const [projectPathInput, setProjectPathInput] = useState('')
  const [boardTasks, setBoardTasks] = useState<BoardTask[]>([])
  const [boardError, setBoardError] = useState<string | null>(null)
  const [boardLoading, setBoardLoading] = useState(false)
  const [selectedTask, setSelectedTask] = useState<BoardTask | null>(null)
  const selectedTaskId = selectedTask?.id ?? ''
  const [planContents, setPlanContents] = useState<string | null>(null)
  const [planError, setPlanError] = useState<string | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [selectedTrackId, setSelectedTrackId] = useState('')
  const [trackPlanContents, setTrackPlanContents] = useState<string | null>(null)
  const [trackPlanError, setTrackPlanError] = useState<string | null>(null)
  const [trackPlanLoading, setTrackPlanLoading] = useState(false)

  const trackOptions = useMemo(() => {
    const seen = new Map<string, string>()
    boardTasks.forEach(task => {
      if (!seen.has(task.trackId)) {
        seen.set(task.trackId, task.trackTitle)
      }
    })
    return Array.from(seen.entries()).map(([id, title]) => ({ id, title }))
  }, [boardTasks])

  const trackPhases = useMemo(() => {
    if (!trackPlanContents) {
      return []
    }
    return parsePlanForDetail(trackPlanContents)
  }, [trackPlanContents])

  const selectedTrackTitle = useMemo(() => {
    return trackOptions.find(option => option.id === selectedTrackId)?.title ?? ''
  }, [trackOptions, selectedTrackId])

  const recordDiagnostics = useCallback((_label: string, _payload: unknown) => {}, [])

  const handleBoardResponse = useCallback((response: ProjectLoadResponse) => {
    if (response.ok) {
      setBoardTasks(response.data.tasks)
      setBoardError(null)
      return
    }
    setBoardError(response.error.message)
  }, [])

  useEffect(() => {
    const handleMenuLoad = (_event: Electron.IpcRendererEvent, response: ProjectLoadResponse) => {
      if (response.ok) {
        setProjectPathInput(response.data.projectPath)
      }
      handleBoardResponse(response)
    }

    window.ipcRenderer.on(IPC_CHANNELS.menuProjectLoad, handleMenuLoad)

    return () => {
      window.ipcRenderer.off(IPC_CHANNELS.menuProjectLoad, handleMenuLoad)
    }
  }, [handleBoardResponse])

  useEffect(() => {
    if (trackOptions.length === 0) {
      if (selectedTrackId !== '') {
        setSelectedTrackId('')
      }
      return
    }
    if (!trackOptions.some(option => option.id === selectedTrackId)) {
      setSelectedTrackId(trackOptions[0].id)
    }
  }, [trackOptions, selectedTrackId])

  const handleRefreshBoard = useCallback(async () => {
    const projectPath = projectPathInput.trim()
    if (projectPath.length === 0) {
      setBoardError('Project path is required.')
      return
    }
    setBoardLoading(true)
    try {
      const response: ProjectLoadResponse = await window.projectApi.refreshBoard(projectPath)
      recordDiagnostics('Refresh Board', response)
      handleBoardResponse(response)
    } catch (err) {
      setDiagnosticError('Failed to refresh board.')
      setBoardError('Failed to refresh board.')
      console.error('Failed to refresh board:', err)
    } finally {
      setBoardLoading(false)
    }
  }, [projectPathInput])

  const handleTaskStatusChange = useCallback(
    async (task: BoardTask, nextStatus: TaskStatus) => {
      const projectPath = projectPathInput.trim()
      if (projectPath.length === 0) {
        setBoardError('Project path is required.')
        return
      }

      setBoardTasks(prev =>
        prev.map(item =>
          item.id === task.id
            ? {
                ...item,
                status: nextStatus,
                statusSource: 'explicit',
                needsSync: false,
              }
            : item,
        ),
      )

      try {
        const response = await window.projectApi.updateTaskStatus({
          projectPath,
          trackId: task.trackId,
          trackTitle: task.trackTitle,
          phase: task.phase,
          title: task.title,
          nextStatus,
        })
        recordDiagnostics('Update Task Status', response)
        if (!response.ok) {
          setBoardError(response.error.message)
          return
        }
        const refreshResponse: ProjectLoadResponse = await window.projectApi.refreshBoard(projectPath)
        recordDiagnostics('Refresh Board', refreshResponse)
        handleBoardResponse(refreshResponse)
      } catch (err) {
        setBoardError('Failed to update task status.')
        console.error('Failed to update task status:', err)
      }
    },
    [projectPathInput, handleBoardResponse, recordDiagnostics],
  )

  const loadPlanDetails = useCallback(
    async (task: BoardTask, projectPath: string) => {
      const response = await window.projectApi.getPlanDetails({
        projectPath,
        trackId: task.trackId,
        trackTitle: task.trackTitle,
      })
      if (response.ok) {
        setPlanContents(response.data.planContents)
        setPlanError(null)
      } else {
        setPlanContents(null)
        setPlanError(response.error.message)
      }
    },
    [setPlanContents, setPlanError],
  )

  const loadTrackPlanDetails = useCallback(
    async (trackId: string, trackTitle: string, projectPath: string) => {
      const response = await window.projectApi.getPlanDetails({
        projectPath,
        trackId,
        trackTitle,
      })
      if (response.ok) {
        setTrackPlanContents(response.data.planContents)
        setTrackPlanError(null)
      } else {
        setTrackPlanContents(null)
        setTrackPlanError(response.error.message)
      }
    },
    [setTrackPlanContents, setTrackPlanError],
  )

  const persistPlanContents = useCallback(
    async (nextContents: string) => {
      if (!selectedTask) {
        return
      }
      const projectPath = projectPathInput.trim()
      if (!projectPath) {
        setPlanError('Project path is required.')
        return
      }

      try {
        const response = await window.projectApi.updatePlanContents({
          projectPath,
          trackId: selectedTask.trackId,
          trackTitle: selectedTask.trackTitle,
          planContents: nextContents,
        })
        if (!response.ok) {
          setPlanError(response.error.message)
          return
        }
        setPlanError(null)
      } catch (err) {
        setPlanError('Failed to save plan changes.')
      }
    },
    [selectedTask, projectPathInput],
  )

  useEffect(() => {
    if (!selectedTask) {
      setPlanContents(null)
      setPlanError(null)
      setPlanLoading(false)
      return
    }

    const projectPath = projectPathInput.trim()
    if (!projectPath) {
      setPlanContents(null)
      setPlanError('Project path is required.')
      setPlanLoading(false)
      return
    }

    let isActive = true
    setPlanLoading(true)
    setPlanError(null)

    loadPlanDetails(selectedTask, projectPath)
      .catch(() => {
        if (!isActive) {
          return
        }
        setPlanContents(null)
        setPlanError('Failed to load plan details.')
      })
      .finally(() => {
        if (isActive) {
          setPlanLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [selectedTaskId, projectPathInput, loadPlanDetails])

  useEffect(() => {
    if (activeTab !== 'tracks') {
      return
    }
    if (!selectedTrackId) {
      setTrackPlanContents(null)
      setTrackPlanError(null)
      setTrackPlanLoading(false)
      return
    }
    const projectPath = projectPathInput.trim()
    if (!projectPath) {
      setTrackPlanContents(null)
      setTrackPlanError('Project path is required.')
      setTrackPlanLoading(false)
      return
    }
    const trackTitle = trackOptions.find(option => option.id === selectedTrackId)?.title
    if (!trackTitle) {
      setTrackPlanContents(null)
      setTrackPlanError('Track could not be found.')
      setTrackPlanLoading(false)
      return
    }

    let isActive = true
    setTrackPlanLoading(true)
    setTrackPlanError(null)

    loadTrackPlanDetails(selectedTrackId, trackTitle, projectPath)
      .catch(() => {
        if (!isActive) {
          return
        }
        setTrackPlanContents(null)
        setTrackPlanError('Failed to load track details.')
      })
      .finally(() => {
        if (isActive) {
          setTrackPlanLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [activeTab, selectedTrackId, projectPathInput, trackOptions, loadTrackPlanDetails])

  const handlePlanTaskToggle = useCallback(
    async (payload: { phaseTitle: string; taskTitle: string; currentStatus: TaskStatus }) => {
      if (!selectedTask) {
        return
      }
      const projectPath = projectPathInput.trim()
      if (!projectPath) {
        setPlanError('Project path is required.')
        return
      }

      const nextStatus = nextStatusFromCurrent(payload.currentStatus)

      setPlanLoading(true)
      setPlanError(null)
      try {
        const response = await window.projectApi.updateTaskStatus({
          projectPath,
          trackId: selectedTask.trackId,
          trackTitle: selectedTask.trackTitle,
          phase: payload.phaseTitle,
          title: payload.taskTitle,
          nextStatus,
        })
        if (!response.ok) {
          setPlanError(response.error.message)
          return
        }
        await loadPlanDetails(selectedTask, projectPath)
      } catch (err) {
        setPlanError('Failed to update plan task.')
      } finally {
        setPlanLoading(false)
      }
    },
    [selectedTask, projectPathInput, loadPlanDetails],
  )

  const handleSubTaskToggle = useCallback(
    (payload: {
      phaseIndex: number
      taskIndex: number
      subTaskIndex: number
      currentStatus: TaskStatus
    }) => {
      const nextStatus = nextStatusFromCurrent(payload.currentStatus)
      const nextMarker = markerFromStatus(nextStatus)
      setPlanContents(prev => {
        if (!prev) {
          return prev
        }
        const nextContents = updateSubTaskMarkerAtIndex(
          prev,
          payload.phaseIndex,
          payload.taskIndex,
          payload.subTaskIndex,
          nextMarker,
        )
        void persistPlanContents(nextContents)
        return nextContents
      })
    },
    [persistPlanContents],
  )

  const handlePhaseTitleEdit = useCallback(
    (payload: { phaseIndex: number; nextTitle: string }) => {
      if (payload.nextTitle.trim().length === 0) {
        return
      }
      setSelectedTask(prev => (prev ? { ...prev, phase: payload.nextTitle } : prev))
      setPlanContents(prev => {
        if (!prev) {
          return prev
        }
        const nextContents = updatePhaseTitleAtIndex(
          prev,
          payload.phaseIndex,
          payload.nextTitle,
        )
        void persistPlanContents(nextContents)
        return nextContents
      })
    },
    [persistPlanContents],
  )

  const handleTaskTitleEdit = useCallback(
    (payload: { phaseIndex: number; taskIndex: number; nextTitle: string }) => {
      if (payload.nextTitle.trim().length === 0) {
        return
      }
      setSelectedTask(prev => (prev ? { ...prev, title: payload.nextTitle } : prev))
      setPlanContents(prev => {
        if (!prev) {
          return prev
        }
        const nextContents = updateTaskTitleAtIndex(
          prev,
          payload.phaseIndex,
          payload.taskIndex,
          payload.nextTitle,
        )
        void persistPlanContents(nextContents)
        return nextContents
      })
    },
    [persistPlanContents],
  )

  const handleSubTaskTitleEdit = useCallback(
    (payload: {
      phaseIndex: number
      taskIndex: number
      subTaskIndex: number
      nextTitle: string
    }) => {
      if (payload.nextTitle.trim().length === 0) {
        return
      }
      setPlanContents(prev => {
        if (!prev) {
          return prev
        }
        const nextContents = updateSubTaskTitleAtIndex(
          prev,
          payload.phaseIndex,
          payload.taskIndex,
          payload.subTaskIndex,
          payload.nextTitle,
        )
        void persistPlanContents(nextContents)
        return nextContents
      })
    },
    [persistPlanContents],
  )

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="text-primary w-5 h-5" />
            Conductor
          </h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Button
            variant={activeTab === 'board' ? 'secondary' : 'ghost'}
            className="w-full justify-start gap-2"
            onClick={() => setActiveTab('board')}
          >
            <LayoutDashboard className="w-4 h-4" />
            Board
          </Button>
          <Button
            variant={activeTab === 'tracks' ? 'secondary' : 'ghost'}
            className="w-full justify-start gap-2"
            onClick={() => setActiveTab('tracks')}
          >
            <ListTodo className="w-4 h-4" />
            Tracks
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2">
            <TerminalIcon className="w-4 h-4" />
            Terminal
          </Button>
        </nav>
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight">Command Center</h1>
          </header>

          {activeTab === 'board' ? (
            <section className="space-y-4" data-testid="board-tab">
              <h2 className="text-lg font-semibold">Board</h2>
              <BoardPanel
                tasks={boardTasks}
                isLoading={boardLoading}
                error={boardError}
                onRefresh={handleRefreshBoard}
                onTaskStatusChange={handleTaskStatusChange}
                onTaskSelect={task => setSelectedTask(task)}
              />
            </section>
          ) : null}

          {activeTab === 'tracks' ? (
            <section className="space-y-4" data-testid="tracks-tab">
              <h2 className="text-lg font-semibold">Tracks</h2>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="track-select">
                  Track
                </label>
                <select
                  id="track-select"
                  data-testid="track-select"
                  value={selectedTrackId}
                  onChange={event => setSelectedTrackId(event.target.value)}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-xs"
                  disabled={trackOptions.length === 0}
                >
                  {trackOptions.length === 0 ? (
                    <option value="">Load a project to view tracks</option>
                  ) : null}
                  {trackOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-3 rounded border border-dashed border-border bg-background/60 p-3">
                <p className="text-[11px] uppercase text-muted-foreground">Track Plan</p>
                {selectedTrackTitle ? (
                  <p className="text-xs font-semibold text-foreground">{selectedTrackTitle}</p>
                ) : null}
                {trackPlanLoading ? (
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    Loading track plan...
                  </p>
                ) : null}
                {trackPlanError ? (
                  <p className="mt-2 text-xs text-destructive">Track error: {trackPlanError}</p>
                ) : null}
                {!trackPlanLoading && !trackPlanError ? (
                  trackPhases.length > 0 ? (
                    <div className="space-y-4" data-testid="track-plan-view">
                      {trackPhases.map(phase => (
                        <div key={`track-phase-${phase.index}`} className="space-y-2">
                          <p className="text-xs font-semibold text-foreground">{phase.title}</p>
                          <div className="space-y-1">
                            {phase.tasks.map(taskItem => (
                              <div
                                key={`track-task-${phase.index}-${taskItem.index}`}
                                className="space-y-1"
                              >
                                <div className="flex gap-2 text-xs text-foreground">
                                  <span className="font-mono text-muted-foreground">
                                    {taskItem.marker}
                                  </span>
                                  <span>{taskItem.title}</span>
                                </div>
                                {taskItem.subTasks.length > 0 ? (
                                  <div className="space-y-1 pl-4 text-xs text-foreground">
                                    {taskItem.subTasks.map(subTask => (
                                      <div
                                        key={`track-subtask-${phase.index}-${taskItem.index}-${subTask.index}`}
                                        className="flex gap-2"
                                      >
                                        <span className="font-mono text-muted-foreground">
                                          {subTask.marker}
                                        </span>
                                        <span>{subTask.title}</span>
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
                      Track plan will appear here once loaded.
                    </p>
                  )
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </main>
      {selectedTask ? (
        <PlanDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          planContents={planContents}
          isLoading={planLoading}
          error={planError}
          onToggleTask={handlePlanTaskToggle}
          onToggleSubTask={handleSubTaskToggle}
          onEditPhaseTitle={handlePhaseTitleEdit}
          onEditTaskTitle={handleTaskTitleEdit}
          onEditSubTaskTitle={handleSubTaskTitleEdit}
        />
      ) : null}
    </div>
  )
}

export default App
