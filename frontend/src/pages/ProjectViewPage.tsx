import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { IssueCreateModal } from '@/components/IssueCreateModal'
import { IssueDetailView } from '@/components/IssueDetailView'
import { IssueListView } from '@/components/IssueListView'
import { KanbanBoard } from '@/components/KanbanBoard'
import type { BoardTask } from '@/components/KanbanBoard'
import { LoadErrorCard } from '@/components/LoadErrorCard'
import { LogStatsView } from '@/components/LogStatsView'
import { LogTimelineView } from '@/components/LogTimelineView'
import { LogViewer } from '@/components/LogViewer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Issue, ProjectDetail, ScoredCandidate } from '@/lib/fleetTypes'
import { useWebSocket } from '@/lib/useWebSocket'

function formatTimestamp(value: number) {
  if (!value) {
    return 'Unknown'
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value * 1000))
}

function updateTaskStatus(project: ProjectDetail, taskId: string, status: string) {
  return {
    ...project,
    tracks: project.tracks.map(track => ({
      ...track,
      phases: track.phases.map(phase => ({
        ...phase,
        tasks: phase.tasks.map(task => (task.id === taskId ? { ...task, status } : task)),
      })),
    })),
  }
}

type IssuePreview = {
  fileName: string
  path: string
  content: string
  matchReason: string
}

type IssueState = {
  loading: boolean
  error: string | null
  task: Pick<BoardTask, 'id' | 'description' | 'phase' | 'trackName'> | null
  issue: IssuePreview | null
}

export function ProjectViewPage() {
  const { id } = useParams()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [runStatus, setRunStatus] = useState<string | null>(null)
  const [taskStatusMessage, setTaskStatusMessage] = useState<string | null>(null)
  const [taskStatusError, setTaskStatusError] = useState<string | null>(null)
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [issueState, setIssueState] = useState<IssueState | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [showCreateIssue, setShowCreateIssue] = useState(false)
  const [nextTask, setNextTask] = useState<ScoredCandidate | null>(null)
  const [nextTaskLoading, setNextTaskLoading] = useState(false)
  const { lines, connected, clearLines } = useWebSocket(id ?? '')

  useEffect(() => {
    if (!id) {
      setError('Project id is missing from the route.')
      setLoading(false)
      return
    }

    const controller = new AbortController()

    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
          signal: controller.signal,
        })
        const payload = (await response.json()) as ProjectDetail & { error?: string }
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to load project')
        }
        setProject(payload)
      } catch (loadError) {
        if (controller.signal.aborted) {
          return
        }
        const message = loadError instanceof Error ? loadError.message : 'Unknown error'
        setError(message)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    })()

    return () => controller.abort()
  }, [id])

  const fetchNextTask = useCallback(async () => {
    if (!id) {
      return
    }
    setNextTaskLoading(true)
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(id)}/next-task`)
      if (response.status === 404) {
        setNextTask(null)
        return
      }
      const payload = (await response.json()) as ScoredCandidate & { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to load next task')
      }
      setNextTask(payload)
    } catch {
      setNextTask(null)
    } finally {
      setNextTaskLoading(false)
    }
  }, [id])

  useEffect(() => {
    void fetchNextTask()
  }, [fetchNextTask])

  const handleMoveTask = useCallback(
    async (taskId: string, nextStatus: 'todo' | 'active' | 'blocked' | 'done') => {
      if (!id || !project) {
        return
      }

      const previousProject = project
      setPendingTaskId(taskId)
      setTaskStatusError(null)
      setTaskStatusMessage(null)
      setProject(current => (current ? updateTaskStatus(current, taskId, nextStatus) : current))

      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(id)}/tasks/${taskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: nextStatus }),
        })
        const payload = (await response.json()) as { error?: string; status?: string }
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to update task status')
        }

        const finalStatus = (payload.status ?? nextStatus) as 'todo' | 'active' | 'blocked' | 'done'
        setProject(current => (current ? updateTaskStatus(current, taskId, finalStatus) : current))
        setTaskStatusMessage(`Updated ${taskId} to ${finalStatus}.`)
      } catch (updateError) {
        setProject(previousProject)
        setTaskStatusError(
          updateError instanceof Error ? updateError.message : 'Unknown error updating task',
        )
      } finally {
        setPendingTaskId(current => (current === taskId ? null : current))
      }
    },
    [id, project],
  )

  const handleBlockedTaskSelect = useCallback(
    async (task: BoardTask) => {
      if (!id) {
        return
      }

      setIssueState({
        loading: true,
        error: null,
        task,
        issue: null,
      })

      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(id)}/issues/${encodeURIComponent(task.id)}`,
        )
        const payload = (await response.json()) as IssuePreview & { error?: string }
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to load issue markdown')
        }

        setIssueState({
          loading: false,
          error: null,
          task,
          issue: {
            fileName: payload.fileName,
            path: payload.path,
            content: payload.content,
            matchReason: payload.matchReason,
          },
        })
      } catch (issueError) {
        setIssueState({
          loading: false,
          error: issueError instanceof Error ? issueError.message : 'Unknown error',
          task,
          issue: null,
        })
      }
    },
    [id],
  )

  const stats = useMemo(() => {
    if (!project) {
      return { tracks: 0, tasks: 0, blocked: 0, active: 0 }
    }

    const tasks = project.tracks.flatMap(track => track.phases.flatMap(phase => phase.tasks))

    return {
      tracks: project.tracks.length,
      tasks: tasks.length,
      blocked: tasks.filter(task => task.status === 'blocked').length,
      active: tasks.filter(task => task.status === 'active').length,
    }
  }, [project])

  const triggerRun = async () => {
    if (!id) {
      return
    }

    setRunning(true)
    setRunStatus(null)

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(id)}/run`, {
        method: 'POST',
      })
      const payload = (await response.json()) as { error?: string; status?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to trigger orchestrator run')
      }
      setRunStatus(payload.status ?? 'started')
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Unknown error'
      setRunStatus(message)
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle>Loading project board...</CardTitle>
          <CardDescription>
            Fetching the latest track and task state from the daemon.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error || !project) {
    return <LoadErrorCard message={error ?? 'Project not found'} />
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-cyan-400/20 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.18),_transparent_36%),linear-gradient(180deg,_rgba(15,23,42,0.96),_rgba(2,6,23,0.9))] shadow-2xl shadow-cyan-950/20">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100">
                Project detail
              </div>
              <CardTitle className="text-3xl">{project.name}</CardTitle>
              <CardDescription className="max-w-3xl text-base text-slate-300">
                {project.path}
              </CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link to="/">Back to dashboard</Link>
            </Button>
            <Button type="button" onClick={() => void triggerRun()} disabled={running}>
              {running ? 'Triggering...' : 'Trigger Orchestrator Run'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border/60 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Tracks</p>
            <p className="mt-2 text-2xl font-semibold">{stats.tracks}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Tasks</p>
            <p className="mt-2 text-2xl font-semibold">{stats.tasks}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Active</p>
            <p className="mt-2 text-2xl font-semibold">{stats.active}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Last updated
            </p>
            <p className="mt-2 text-sm text-slate-300">{formatTimestamp(project.lastUpdated)}</p>
          </div>
        </CardContent>
      </Card>

      {runStatus ? (
        <Card className="border-border/60 bg-background/60">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">Run status</CardTitle>
            <CardDescription>{runStatus}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="border-emerald-400/20 bg-emerald-400/5">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="text-base">Next task</CardTitle>
            <CardDescription>
              Top-ranked task from the dispatcher scoring engine.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void fetchNextTask()}
            disabled={nextTaskLoading}
          >
            {nextTaskLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </CardHeader>
        <CardContent>
          {nextTask ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                  Score: {nextTask.score.toFixed(1)}
                </span>
                <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                  {nextTask.id}
                </span>
                {nextTask.agentTag ? (
                  <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                    {nextTask.agentTag}
                  </span>
                ) : null}
              </div>
              <p className="text-sm font-medium">{nextTask.title}</p>
              {nextTask.rationale ? (
                <p className="text-xs text-muted-foreground">Rationale: {nextTask.rationale}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {nextTaskLoading ? 'Loading...' : 'No tasks available.'}
            </p>
          )}
        </CardContent>
      </Card>

      {taskStatusError || taskStatusMessage ? (
        <Card className="border-border/60 bg-background/60">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">
              {taskStatusError ? 'Task update failed' : 'Task update complete'}
            </CardTitle>
            <CardDescription>{taskStatusError ?? taskStatusMessage}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <Card className="border-border/60 bg-background/60">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">Board summary</CardTitle>
            <CardDescription>Quick counts for the current plan state.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Blocked</span>
              <span className="font-medium">{stats.blocked}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Done</span>
              <span className="font-medium">
                {
                  project.tracks
                    .flatMap(track => track.phases.flatMap(phase => phase.tasks))
                    .filter(task => task.status === 'done').length
                }
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/60 md:col-span-2 xl:col-span-3">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">Tracks at a glance</CardTitle>
            <CardDescription>
              Track names and plan files pulled from the API response.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {project.tracks.map(track => (
              <span
                key={track.id}
                className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground"
              >
                {track.name}
              </span>
            ))}
          </CardContent>
        </Card>
      </div>

      {issueState ? (
        <Card className="border-rose-400/30 bg-rose-400/10 shadow-2xl shadow-rose-950/10">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-2">
              <CardTitle className="text-base">
                {issueState.loading ? 'Loading issue markdown...' : 'Blocked task issue'}
              </CardTitle>
              <CardDescription>
                {issueState.loading
                  ? 'Fetching the matching broker file for the selected task.'
                  : (issueState.error ??
                    `Selected task ${issueState.task?.id ?? 'unknown'} in ${
                      issueState.task?.trackName ?? 'unknown track'
                    }.`)}
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setIssueState(null)}>
              Clear
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {!issueState.loading && !issueState.error && issueState.issue ? (
              <>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border/60 bg-background/70 px-2 py-1">
                    File: {issueState.issue.fileName}
                  </span>
                  <span className="rounded-full border border-border/60 bg-background/70 px-2 py-1">
                    Path: {issueState.issue.path}
                  </span>
                  <span className="rounded-full border border-border/60 bg-background/70 px-2 py-1">
                    Match: {issueState.issue.matchReason || 'heuristic match'}
                  </span>
                </div>
                <pre className="max-h-96 overflow-auto rounded-2xl border border-border/60 bg-black/40 p-4 font-mono text-sm whitespace-pre-wrap break-words text-rose-50">
                  {issueState.issue.content}
                </pre>
              </>
            ) : null}
            {issueState.loading ? (
              <p className="text-sm text-muted-foreground">Loading issue markdown...</p>
            ) : null}
            {issueState.error ? (
              <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                {issueState.error}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <KanbanBoard
        project={project}
        pendingTaskId={pendingTaskId}
        onBlockedTaskSelect={task => {
          void handleBlockedTaskSelect(task)
        }}
        onMoveTask={(taskId, nextStatus) => {
          void handleMoveTask(taskId, nextStatus)
        }}
      />

      {id ? (
        <>
          {selectedIssue ? (
            <IssueDetailView
              issue={selectedIssue}
              projectId={id}
              onClose={() => setSelectedIssue(null)}
              onStatusChange={(issueId, status) => {
                setSelectedIssue(prev =>
                  prev && prev.id === issueId ? { ...prev, status } : prev,
                )
              }}
            />
          ) : null}

          <IssueListView
            projectId={id}
            onIssueSelect={setSelectedIssue}
            onCreateClick={() => setShowCreateIssue(true)}
          />

          {showCreateIssue ? (
            <IssueCreateModal
              projectId={id}
              onClose={() => setShowCreateIssue(false)}
              onCreated={() => {
                setShowCreateIssue(false)
              }}
            />
          ) : null}

          <LogTimelineView projectId={id} />

          <LogStatsView projectId={id} />
        </>
      ) : null}

      <Card className="border-border/60 bg-background/60">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="text-base">Live execution log</CardTitle>
            <CardDescription>
              {connected ? 'Connected to the project WebSocket stream.' : 'Waiting for output.'}
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={clearLines}>
            Clear
          </Button>
        </CardHeader>
        <CardContent>
          <LogViewer
            lines={lines}
            connected={connected}
            className="min-h-72 border border-border/60"
          />
        </CardContent>
      </Card>
    </div>
  )
}
