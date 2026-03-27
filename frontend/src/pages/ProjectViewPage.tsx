import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { KanbanBoard } from '@/components/KanbanBoard'
import { LoadErrorCard } from '@/components/LoadErrorCard'
import { LogViewer } from '@/components/LogViewer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProjectDetail } from '@/lib/fleetTypes'
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

      <KanbanBoard
        project={project}
        pendingTaskId={pendingTaskId}
        onMoveTask={(taskId, nextStatus) => {
          void handleMoveTask(taskId, nextStatus)
        }}
      />

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
