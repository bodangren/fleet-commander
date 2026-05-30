import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { CoverageChart } from '@/components/CoverageChart'
import { DependencyGraph } from '@/components/DependencyGraph'
import { IssueCreateModal } from '@/components/IssueCreateModal'
import { IssueDetailView } from '@/components/IssueDetailView'
import { IssueListView } from '@/components/IssueListView'
import { KanbanBoard } from '@/components/legacy/KanbanBoard'
import { ReviewResults } from '@/components/ReviewResults'
import { SprintPanel } from '@/components/SprintPanel'
import type { BoardTask } from '@/components/legacy/KanbanBoard'
import { LoadErrorCard } from '@/components/LoadErrorCard'
import { LogStatsView } from '@/components/LogStatsView'
import { LogTimelineView } from '@/components/LogTimelineView'
import { LogViewer } from '@/components/LogViewer'
import { EmployeePerformancePanel } from '@/components/performance/EmployeePerformancePanel'
import { Button } from '@/components/ui/button'
import type { Issue, IssueStatus } from '@/lib/fleetTypes'
import { useEmployeePerformance } from '@/lib/useFleetApi'
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

type TabKey =
  | 'board'
  | 'dependencies'
  | 'issues'
  | 'sprint'
  | 'logs'
  | 'review'
  | 'coverage'
  | 'performance'

/**
 * Main project view with kanban board, logs, issues, sprint, review, and coverage tabs
 */
export function ProjectViewPage() {
  const { id } = useParams()
  const { project, loading, error: loadError, ...rest } = useProjectLoader(id)
  const { nextTask, nextTaskLoading, fetchNextTask } = useNextTask(id)
  const { pendingTaskId, handleMoveTask } = useTaskStatus(
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
  const {
    data: perfData,
    loading: perfLoading,
    error: perfError,
  } = useEmployeePerformance(
    activeTab === 'performance' ? id : undefined,
    activeTab === 'performance' ? id : undefined,
  )

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'board', label: 'Sprint Board' },
    { key: 'dependencies', label: 'Dependencies' },
    { key: 'issues', label: 'Issues' },
    { key: 'sprint', label: 'Sprints' },
    { key: 'logs', label: 'Logs' },
    { key: 'review', label: 'Review' },
    { key: 'coverage', label: 'Coverage' },
    { key: 'performance', label: 'Performance' },
  ]

  if (loading) {
    return (
      <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
        <div className="text-sm font-medium">Loading project board...</div>
        <div className="text-sm text-[#8a8f98] mt-1">
          Fetching the latest track and task state from the daemon.
        </div>
      </div>
    )
  }

  if (loadError || !project) {
    return <LoadErrorCard message={loadError ?? 'Project not found'} />
  }

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-[rgba(94,106,210,0.15)] text-[#5e6ad2]">
              PROJECT
            </span>
            <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
            <div className="text-sm text-[#8a8f98]">{project.path}</div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/">Dashboard</Link>
            </Button>
            <Button type="button" onClick={() => void triggerRun()} disabled={running} size="sm">
              {running ? 'Executing...' : 'Trigger Run'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-[#141516] rounded-lg p-4">
            <div className="text-xs text-[#8a8f98] uppercase tracking-wider">Tracks</div>
            <div className="text-2xl font-semibold mt-1">{stats.tracks}</div>
          </div>
          <div className="bg-[#141516] rounded-lg p-4">
            <div className="text-xs text-[#8a8f98] uppercase tracking-wider">Tasks</div>
            <div className="text-2xl font-semibold mt-1">{stats.tasks}</div>
          </div>
          <div className="bg-[#141516] rounded-lg p-4">
            <div className="text-xs text-[#8a8f98] uppercase tracking-wider">Active</div>
            <div className="text-2xl font-semibold mt-1">{stats.active}</div>
          </div>
          <div className="bg-[#141516] rounded-lg p-4">
            <div className="text-xs text-[#8a8f98] uppercase tracking-wider">Last Pulse</div>
            <div className="text-sm text-[#8a8f98] mt-1">
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date((project.lastUpdated || 0) * 1000))}
            </div>
          </div>
        </div>
      </div>

      {/* Run Status */}
      {runStatus ? (
        <div className="rounded-xl border border-[#5e6ad2] bg-[rgba(94,106,210,0.05)] p-4">
          <div className="text-xs font-medium text-[#5e6ad2]">RUN STATUS</div>
          <div className="text-sm mt-1">{runStatus}</div>
        </div>
      ) : null}

      {/* Next Task */}
      <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Next Mission</h2>
              <div className="text-sm text-[#8a8f98]">Dispatcher scored high-intensity output</div>
            </div>
            {nextTask ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-[#5e6ad2] text-white">
                    Score: {nextTask.score.toFixed(1)}
                  </span>
                  <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-[#141516] text-[#8a8f98]">
                    ID: {nextTask.id}
                  </span>
                  {nextTask.agentTag ? (
                    <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-[rgba(94,106,210,0.15)] text-[#5e6ad2]">
                      Agent: {nextTask.agentTag}
                    </span>
                  ) : null}
                </div>
                <p className="text-lg font-medium">{nextTask.title}</p>
                {nextTask.rationale ? (
                  <p className="text-xs text-[#8a8f98] bg-[#141516] p-3 rounded-md border-l-2 border-[#5e6ad2]">
                    {nextTask.rationale}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-[#8a8f98]">
                {nextTaskLoading ? 'Scanning...' : 'No tasks available'}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void fetchNextTask()}
            disabled={nextTaskLoading}
            aria-label="Refresh Next Task"
          >
            {nextTaskLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#23252a]">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.key
                ? 'text-[#f7f8f8] border-[#5e6ad2]'
                : 'text-[#8a8f98] border-transparent hover:text-[#d0d6e0]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
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

      {issueState && (
        <div className="rounded-xl border border-[rgba(235,61,84,0.3)] bg-[rgba(235,61,84,0.05)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-[#eb3d54]">BLOCKED TASK ISSUE</div>
              {issueState.task && (
                <div className="text-xs text-[#8a8f98] mt-1">
                  Task: {issueState.task.description}
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearIssueState}
              aria-label="Close issue preview"
            >
              Dismiss
            </Button>
          </div>
          {issueState.loading && (
            <p className="text-sm text-[#8a8f98] mt-2">Loading issue details...</p>
          )}
          {issueState.error && <p className="text-sm text-[#eb3d54] mt-2">{issueState.error}</p>}
          {issueState.issue && (
            <div className="space-y-2 mt-2">
              <p className="text-xs text-[#8a8f98]">File: {issueState.issue.fileName}</p>
              <p className="text-xs text-[#8a8f98]">{issueState.issue.matchReason}</p>
              <pre className="overflow-x-auto rounded-md border border-[#23252a] bg-[#010102] p-3 text-xs">
                {issueState.issue.content.slice(0, 500)}
              </pre>
            </div>
          )}
        </div>
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
        <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
          <div className="space-y-1 mb-4">
            <div className="font-semibold">Code Review Results</div>
            <div className="text-sm text-[#8a8f98]">
              Review results from the automated pipeline after task execution. Click a completed
              task on the Kanban board to view its review.
            </div>
          </div>
          {reviewLoading ? (
            <p className="text-sm text-[#8a8f98]">Loading review results...</p>
          ) : reviewError ? (
            <p className="text-sm text-[#eb3d54]">{reviewError}</p>
          ) : review && review.status !== 'not_found' ? (
            <ReviewResults
              results={review.results ?? []}
              overallStatus={review.status}
              reviewedAt={review.reviewedAt}
              agentReview={review.agentReview}
              reviewDepth={review.reviewDepth}
            />
          ) : (
            <p className="text-sm text-[#8a8f98]">
              No review results found. Run the orchestrator on a completed task to generate review
              data.
            </p>
          )}
        </div>
      )}

      {activeTab === 'coverage' && id && <CoverageChart projectSlug={id} />}

      {activeTab === 'performance' && id && (
        <EmployeePerformancePanel
          employeeId={id}
          projectId={id}
          metrics={perfData?.baselines ?? null}
          regressions={[]}
          trend={[]}
          loading={perfLoading}
          error={perfError}
        />
      )}

      {/* Live Log */}
      <div className="rounded-xl border border-[#23252a] bg-[#0f1011] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <div className="font-semibold">Live execution log</div>
            <div className="text-sm text-[#8a8f98]">
              {connected ? 'Connected to the project WebSocket stream.' : 'Waiting for output.'}
            </div>
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
        </div>
        <LogViewer
          lines={lines}
          connected={connected}
          className="min-h-72 border border-[#23252a] bg-[#010102] rounded-lg"
        />
      </div>
    </div>
  )
}
