import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { CoverageChart } from '@/components/CoverageChart'
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

type TabKey = 'board' | 'dependencies' | 'issues' | 'sprint' | 'logs' | 'review' | 'coverage'

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
  const { review, loading: reviewLoading, error: reviewError, fetchReview } = useTaskReview(id)
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
    { key: 'coverage', label: 'Coverage' },
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
    <div className="space-y-6">
      <Card className="overflow-hidden border-secondary bg-background relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/20 blur-[100px] pointer-events-none" />
        <CardHeader className="space-y-6 relative z-10 p-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="inline-flex border-2 border-primary bg-primary px-3 py-1 text-xs font-black uppercase tracking-[0.3em] text-primary-foreground italic">
                PROJECT_ORCHESTRATOR
              </div>
              <h1 className="text-6xl font-black italic tracking-tighter leading-none">
                {project.name}
              </h1>
              <CardDescription className="max-w-3xl text-lg font-bold text-muted-foreground uppercase tracking-wider">
                // {project.path}
              </CardDescription>
            </div>
            <div className="flex gap-4">
              <Button asChild variant="outline" size="lg">
                <Link to="/">DASHBOARD</Link>
              </Button>
              <Button 
                type="button" 
                onClick={() => void triggerRun()} 
                disabled={running}
                variant="secondary"
                size="lg"
                className="italic"
              >
                {running ? 'EXECUTING...' : 'TRIGGER_RUN'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4 p-8 pt-0">
          <div className="border-2 border-border bg-card p-6 shadow-[4px_4px_0px_0px_hsl(var(--secondary))]">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">TRACKS</p>
            <p className="mt-2 text-4xl font-black italic">{stats.tracks}</p>
          </div>
          <div className="border-2 border-border bg-card p-6 shadow-[4px_4px_0px_0px_hsl(var(--primary))]">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">TASKS</p>
            <p className="mt-2 text-4xl font-black italic">{stats.tasks}</p>
          </div>
          <div className="border-2 border-border bg-card p-6 shadow-[4px_4px_0px_0px_hsl(var(--accent))]">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">ACTIVE</p>
            <p className="mt-2 text-4xl font-black italic">{stats.active}</p>
          </div>
          <div className="border-2 border-border bg-card p-6 shadow-[4px_4px_0px_0px_hsl(var(--foreground))]">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
              LAST_PULSE
            </p>
            <p className="mt-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date((project.lastUpdated || 0) * 1000))}
            </p>
          </div>
        </CardContent>
      </Card>

      {runStatus ? (
        <Card className="border-primary bg-primary/5">
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-black italic">RUN_STATUS</CardTitle>
            <CardDescription className="text-primary font-bold">{runStatus}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="border-4 border-primary bg-primary/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-xs font-black italic uppercase">
          PRIORITY_TASK
        </div>
        <CardHeader className="flex flex-row items-start justify-between gap-6 p-8">
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-4xl font-black italic tracking-tighter">NEXT_MISSION</h2>
              <CardDescription className="text-xs font-bold tracking-widest uppercase">Dispatcher Scored High-Intensity Output</CardDescription>
            </div>
            {nextTask ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="bg-primary text-primary-foreground px-3 py-1 text-xs font-black italic uppercase">
                    SCORE: {nextTask.score.toFixed(1)}
                  </span>
                  <span className="border-2 border-border bg-background px-3 py-1 text-xs font-bold text-muted-foreground">
                    ID: {nextTask.id}
                  </span>
                  {nextTask.agentTag ? (
                    <span className="border-2 border-primary bg-background px-3 py-1 text-xs font-black text-primary italic uppercase">
                      AGENT: {nextTask.agentTag}
                    </span>
                  ) : null}
                </div>
                <p className="text-2xl font-black uppercase tracking-tight leading-none">{nextTask.title}</p>
                {nextTask.rationale ? (
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest bg-black/40 p-3 border-l-4 border-secondary">
                    RATIONALE // {nextTask.rationale}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-lg font-black italic text-muted-foreground uppercase">
                {nextTaskLoading ? 'SCANNING...' : 'NO_TASKS_AVAILABLE'}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="default"
            size="lg"
            onClick={() => void fetchNextTask()}
            disabled={nextTaskLoading}
            aria-label="Refresh Next Task"
            className="italic"
          >
            {nextTaskLoading ? 'REFRESHING...' : 'REFRESH'}
          </Button>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap gap-2 p-2 border-4 border-border bg-muted/20">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] italic transition-all ${
              activeTab === tab.key
                ? 'bg-secondary text-secondary-foreground shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)]'
                : 'text-muted-foreground hover:bg-border hover:text-foreground'
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

      {activeTab === 'coverage' && id && <CoverageChart projectSlug={id} />}

      <Card className="border-border/60 bg-background/60">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="text-base">Live execution log</CardTitle>
            <CardDescription>
              {connected ? 'Connected to the project WebSocket stream.' : 'Waiting for output.'}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearLines}
            aria-label="Clear Live Log"
          >
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
