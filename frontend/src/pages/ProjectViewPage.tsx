import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { DependencyGraph } from '@/components/DependencyGraph'
import { IssueCreateModal } from '@/components/IssueCreateModal'
import { IssueDetailView } from '@/components/IssueDetailView'
import { IssueListView } from '@/components/IssueListView'
import { KanbanBoard } from '@/components/KanbanBoard'
import { ReviewResults } from '@/components/ReviewResults'
import { SprintPanel } from '@/components/SprintPanel'
import type { BoardTask } from '@/components/KanbanBoard'
import { LoadErrorCard } from '@/components/LoadErrorCard'
import { LogStatsView } from '@/components/LogStatsView'
import { LogTimelineView } from '@/components/LogTimelineView'
import { LogViewer } from '@/components/LogViewer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Issue, IssueStatus } from '@/lib/fleetTypes'
import { useWebSocket } from '@/lib/useWebSocket'
import {
  useIssuePreview,
  useNextTask,
  useOrchestratorRun,
  useProjectLoader,
  useProjectStats,
  useTaskStatus,
} from '@/hooks/useProjectView'
import { useTaskReview } from '@/hooks/useTaskReview'

type TabKey = 'board' | 'dependencies' | 'issues' | 'sprint' | 'logs' | 'review'

export function ProjectViewPage() {
  const { id } = useParams()
  const { project, loading, error: loadError, ...rest } = useProjectLoader(id)
  const { nextTask, nextTaskLoading, fetchNextTask } = useNextTask(id)
  const { pendingTaskId, taskStatusMessage, taskStatusError, handleMoveTask } = useTaskStatus(
    id,
    project,
    rest.setProject || (() => {}),
  )
  const { issueState, handleBlockedTaskSelect, clearIssueState } = useIssuePreview(id)
  const { running, runStatus, triggerRun } = useOrchestratorRun(id)
  const {
    review,
    loading: reviewLoading,
    error: reviewError,
    fetchReview,
  } = useTaskReview(id)
  const stats = useProjectStats(project)
  const { lines, connected, clearLines, getTaskStatus } = useWebSocket(id ?? '')
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [showCreateIssue, setShowCreateIssue] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('board')

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'board', label: 'Kanban Board' },
    { key: 'dependencies', label: 'Dependencies' },
    { key: 'issues', label: 'Issues' },
    { key: 'sprint', label: 'Sprint' },
    { key: 'logs', label: 'Logs' },
    { key: 'review', label: 'Review' },
  ]

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

  if (loadError || !project) {
    return <LoadErrorCard message={loadError ?? 'Project not found'} />
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
            <p className="mt-2 text-sm text-slate-300">
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date((project.lastUpdated || 0) * 1000))}
            </p>
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
            <CardDescription>Top-ranked task from the dispatcher scoring engine.</CardDescription>
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
              <span className="font-medium">{stats.done}</span>
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
            <Button type="button" variant="outline" size="sm" onClick={clearIssueState}>
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

      <div className="flex gap-1 rounded-lg border border-border/60 bg-black/20 p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-cyan-400/20 text-cyan-100'
                : 'text-muted-foreground hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'board' && (
        <KanbanBoard
          project={project}
          pendingTaskId={pendingTaskId}
          getTaskStatus={getTaskStatus}
          onBlockedTaskSelect={(task: BoardTask) => {
            void handleBlockedTaskSelect(task)
          }}
          onDoneTaskSelect={(task: BoardTask) => {
            setActiveTab('review')
            void fetchReview(task.id)
          }}
          onMoveTask={(taskId: string, nextStatus: 'todo' | 'active' | 'blocked' | 'done') => {
            void handleMoveTask(taskId, nextStatus)
          }}
        />
      )}

      {activeTab === 'dependencies' && id && <DependencyGraph projectId={id} />}

      {activeTab === 'issues' && id && (
        <>
          {selectedIssue ? (
            <IssueDetailView
              issue={selectedIssue}
              projectId={id}
              onClose={() => setSelectedIssue(null)}
              onStatusChange={(issueId: string, status: string) => {
                setSelectedIssue(prev =>
                  prev && prev.id === issueId ? { ...prev, status: status as IssueStatus } : prev,
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
        </>
      )}

      {activeTab === 'sprint' && id && <SprintPanel projectId={id} />}

      {activeTab === 'logs' && id && (
        <>
          <LogTimelineView projectId={id} />
          <LogStatsView projectId={id} />
        </>
      )}

      {activeTab === 'review' && id && (
        <Card className="border-border/60 bg-background/60">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">Code Review Results</CardTitle>
            <CardDescription>
              Review results from the automated pipeline after task execution. Click a completed
              task on the Kanban board to view its review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reviewLoading ? (
              <p className="text-sm text-muted-foreground">Loading review results...</p>
            ) : reviewError ? (
              <p className="text-sm text-rose-200">{reviewError}</p>
            ) : review && review.status !== 'not_found' ? (
              <ReviewResults
                results={review.results ?? []}
                overallStatus={review.status}
                reviewedAt={review.reviewedAt}
                agentReview={review.agentReview}
                reviewDepth={review.reviewDepth}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No review results found. Run the orchestrator on a completed task to generate review
                data.
              </p>
            )}
          </CardContent>
        </Card>
      )}

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
