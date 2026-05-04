// Pure aggregation functions for AI Retrospective Engine.
// No Convex dependencies — operates on plain document arrays.

export interface TaskDoc {
  taskKey: string;
  projectSlug: string;
  trackId: string;
  title: string;
  status: string;
  assignee?: string;
  dependencies: string[];
  updatedAt: number;
  retryCount?: number;
  startedAt?: number;
  sessionId?: string;
}

export interface WorkRunDoc {
  runId: string;
  projectSlug: string;
  selectedTaskKey?: string;
  runnerHost?: string;
  status: string;
  startedAt: number;
  finishedAt?: number;
  loadMs?: number;
  scoreMs?: number;
  executeMs?: number;
  persistMs?: number;
  hookBeforeMs?: number;
  hookAfterMs?: number;
  totalMs?: number;
  // sessionResumeMs removed — stub metric (see remediation_20260504_audit)
}

export interface IssueDoc {
  issueId: string;
  projectSlug: string;
  trackId?: string;
  title: string;
  body: string;
  status: string;
  assignedAgent?: string;
  openedAt: number;
  resolvedAt?: number;
}

export interface ExecutionLogDoc {
  runId: string;
  projectSlug: string;
  trackId?: string;
  status: string;
  summary: string;
  createdAt: number;
}

export interface OrchestratorErrorDoc {
  projectSlug?: string;
  taskKey?: string;
  agentId?: string;
  operation: string;
  severity: string;
  message: string;
  createdAt: number;
}

export interface SprintDoc {
  projectSlug: string;
  name: string;
  status: string;
  startDate: number;
  endDate: number;
  goal?: string;
  taskKeys: string[];
  updatedAt: number;
}

export interface SprintAggregateData {
  sprintName: string;
  projectSlug: string;
  dateRange: { start: string; end: string };
  taskCounts: {
    planned: number;
    completed: number;
    blocked: number;
    failed: number;
    carriedOver: number;
  };
  agentWorkload: Array<{
    agent: string;
    tasksAssigned: number;
    tasksCompleted: number;
    avgDurationMs: number;
  }>;
  issuePatterns: Array<{
    pattern: string;
    count: number;
  }>;
  velocity: {
    planned: number;
    completed: number;
    completionRate: number;
  };
  hookFailures: Array<{
    phase: string;
    count: number;
  }>;
  sessionMetrics: {
    totalSessions: number;
    resumedSessions: number;
    continuationRate: number;
  };
  priorityCorrelation: Array<{
    priority: string;
    total: number;
    completed: number;
    completionRate: number;
    avgCycleTimeMs: number;
  }>;
  blockedByChains: Array<{
    taskKey: string;
    blockerCount: number;
    cycleTimeMs: number | null;
  }>;
  topErrors: Array<{
    message: string;
    count: number;
  }>;
}

const TAG_REGEX = /#([\w-]+):(\S+)/g;

export function extractTags(title: string): Record<string, string> {
  const tags: Record<string, string> = {};
  let match: RegExpExecArray | null;
  while ((match = TAG_REGEX.exec(title)) !== null) {
    tags[match[1]] = match[2];
  }
  return tags;
}

export function aggregateSprintData(
  sprint: SprintDoc,
  tasks: readonly TaskDoc[],
  workRuns: readonly WorkRunDoc[],
  issues: readonly IssueDoc[],
  executionLogs: readonly ExecutionLogDoc[],
  orchestratorErrors: readonly OrchestratorErrorDoc[],
): SprintAggregateData {
  const sprintTasks = tasks.filter((t) => sprint.taskKeys.includes(t.taskKey));
  const sprintWorkRuns = workRuns.filter(
    (r) => r.selectedTaskKey && sprint.taskKeys.includes(r.selectedTaskKey),
  );
  const sprintIssues = issues.filter((i) => i.projectSlug === sprint.projectSlug);
  const sprintErrors = orchestratorErrors.filter(
    (e) => e.projectSlug === sprint.projectSlug,
  );

  // Task counts
  const planned = sprint.taskKeys.length;
  const completed = sprintTasks.filter((t) => t.status === 'done').length;
  const blocked = sprintTasks.filter((t) => t.status === 'blocked').length;

  // Failed = tasks with a failed workRun or retryCount > 0 and not done
  const failedTaskKeys = new Set<string>();
  for (const run of sprintWorkRuns) {
    if (run.status === 'failed' && run.selectedTaskKey) {
      failedTaskKeys.add(run.selectedTaskKey);
    }
  }
  for (const t of sprintTasks) {
    if ((t.retryCount ?? 0) > 0 && t.status !== 'done') {
      failedTaskKeys.add(t.taskKey);
    }
  }
  const failed = failedTaskKeys.size;

  // Carried over = not done by sprint end
  const carriedOver = sprintTasks.filter((t) => t.status !== 'done').length;

  // Agent workload
  const agentMap = new Map<
    string,
    { assigned: number; completed: number; durations: number[] }
  >();
  for (const t of sprintTasks) {
    const agent = t.assignee ?? 'unassigned';
    const entry = agentMap.get(agent) ?? {
      assigned: 0,
      completed: 0,
      durations: [],
    };
    entry.assigned++;
    if (t.status === 'done') entry.completed++;
    if (t.startedAt != null && t.updatedAt != null) {
      entry.durations.push(t.updatedAt - t.startedAt);
    }
    agentMap.set(agent, entry);
  }
  const agentWorkload = Array.from(agentMap.entries()).map(([agent, stats]) => ({
    agent,
    tasksAssigned: stats.assigned,
    tasksCompleted: stats.completed,
    avgDurationMs:
      stats.durations.length > 0
        ? Math.round(
            stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length,
          )
        : 0,
  }));

  // Issue patterns — group by first word of title (heuristic for error type)
  const patternMap = new Map<string, number>();
  for (const issue of sprintIssues) {
    const key = issue.title.split(':')[0].trim().toLowerCase() || 'unknown';
    patternMap.set(key, (patternMap.get(key) ?? 0) + 1);
  }
  const issuePatterns = Array.from(patternMap.entries())
    .map(([pattern, count]) => ({ pattern, count }))
    .sort((a, b) => b.count - a.count);

  // Velocity
  const velocity = {
    planned,
    completed,
    completionRate: planned > 0 ? completed / planned : 0,
  };

  // Hook failures
  const HOOK_PHASES = ['beforeRunHook', 'afterRunHook', 'afterCreateHook'];
  const hookMap = new Map<string, number>();
  for (const err of sprintErrors) {
    for (const phase of HOOK_PHASES) {
      if (err.operation.includes(phase)) {
        hookMap.set(phase, (hookMap.get(phase) ?? 0) + 1);
      }
    }
  }
  const hookFailures = HOOK_PHASES.map((phase) => ({
    phase,
    count: hookMap.get(phase) ?? 0,
  }));

  // Session metrics
  const sessionTasks = sprintTasks.filter((t) => t.sessionId);
  const sessionIds = new Set(sessionTasks.map((t) => t.sessionId!));
  const resumedSessions = new Set<string>();
  const seenSessions = new Set<string>();
  for (const t of sprintTasks) {
    if (!t.sessionId) continue;
    if (seenSessions.has(t.sessionId)) {
      resumedSessions.add(t.sessionId);
    } else {
      seenSessions.add(t.sessionId);
    }
  }
  const sessionMetrics = {
    totalSessions: sessionIds.size,
    resumedSessions: resumedSessions.size,
    continuationRate:
      sessionIds.size > 0 ? resumedSessions.size / sessionIds.size : 0,
  };

  // Priority correlation
  const priorityMap = new Map<
    string,
    { total: number; completed: number; cycleTimes: number[] }
  >();
  for (const t of sprintTasks) {
    const tags = extractTags(t.title);
    const priority = tags.priority;
    if (!priority) continue;
    const entry = priorityMap.get(priority) ?? {
      total: 0,
      completed: 0,
      cycleTimes: [],
    };
    entry.total++;
    if (t.status === 'done') entry.completed++;
    if (t.startedAt != null && t.updatedAt != null) {
      entry.cycleTimes.push(t.updatedAt - t.startedAt);
    }
    priorityMap.set(priority, entry);
  }
  const priorityCorrelation = Array.from(priorityMap.entries()).map(
    ([priority, stats]) => ({
      priority,
      total: stats.total,
      completed: stats.completed,
      completionRate: stats.total > 0 ? stats.completed / stats.total : 0,
      avgCycleTimeMs:
        stats.cycleTimes.length > 0
          ? Math.round(
              stats.cycleTimes.reduce((a, b) => a + b, 0) /
                stats.cycleTimes.length,
            )
          : 0,
    }),
  );

  // Blocked-by chains
  const blockedByChains = sprintTasks
    .map((t) => {
      const tags = extractTags(t.title);
      const blockedBy = tags.blocked_by;
      const blockerCount = blockedBy ? blockedBy.split(',').length : 0;
      const cycleTimeMs =
        t.startedAt != null && t.updatedAt != null ? t.updatedAt - t.startedAt : null;
      return { taskKey: t.taskKey, blockerCount, cycleTimeMs };
    })
    .filter((b) => b.blockerCount > 0);

  // Top errors from execution logs and orchestrator errors
  const errorMessages = new Map<string, number>();
  for (const log of executionLogs) {
    if (log.status === 'failed') {
      const msg = log.summary.split('\n')[0].slice(0, 120);
      errorMessages.set(msg, (errorMessages.get(msg) ?? 0) + 1);
    }
  }
  for (const err of sprintErrors) {
    if (err.severity === 'fatal' || err.severity === 'warning') {
      const msg = err.message.slice(0, 120);
      errorMessages.set(msg, (errorMessages.get(msg) ?? 0) + 1);
    }
  }
  const topErrors = Array.from(errorMessages.entries())
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    sprintName: sprint.name,
    projectSlug: sprint.projectSlug,
    dateRange: {
      start: new Date(sprint.startDate).toISOString().slice(0, 10),
      end: new Date(sprint.endDate).toISOString().slice(0, 10),
    },
    taskCounts: {
      planned,
      completed,
      blocked,
      failed,
      carriedOver,
    },
    agentWorkload,
    issuePatterns,
    velocity,
    hookFailures,
    sessionMetrics,
    priorityCorrelation,
    blockedByChains,
    topErrors,
  };
}
