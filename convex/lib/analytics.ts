// Lightweight document interfaces matching the fields used by analytics queries.
// Intentionally minimal — only the fields actually read by computation logic.

import { OrchestratorErrorDoc } from './types';

export interface AnalyticsTaskDoc {
  status: string;
  updatedAt: number;
  title?: string;
  assigneeId?: string;
  startedAt?: number;
  sessionId?: string;
  tags?: Record<string, string>;
  projectSlug?: string;
  trackId?: string;
  taskKey?: string;
}

export interface AnalyticsWorkRunDoc {
  runnerHost?: string;
  status: string;
  startedAt: number;
}

export interface TrendBucket {
  date: string;
  completed: number;
  failed: number;
  created: number;
}

export interface UtilizationEntry {
  agent: string;
  date: string;
  activeTasks: number;
  completedTasks: number;
}

export interface BottleneckEntry {
  trackId: string;
  projectSlug: string;
  totalTasks: number;
  failedTasks: number;
  avgDurationMs: number;
  failureRate: number;
  lastActivityAt: number;
}

export interface QueueBucket {
  date: string;
  pending: number;
  inProgress: number;
  completed: number;
}

export interface HookMetricEntry {
  date: string;
  phase: string;
  executions: number;
  failures: number;
}

export interface SessionMetricsEntry {
  totalTasks: number;
  sessionBoundTasks: number;
  resumptionRate: number;
  activeSessions: number;
  byDate: SessionByDate[];
}

export interface SessionByDate {
  date: string;
  newSessions: number;
  resumedSessions: number;
}

const MS_PER_DAY = 86400000;

export interface AnalyticsTaskFilters {
  agent?: string;
  priority?: string;
}

/**
 * Extracts task priority from tags or title using #priority: or legacy format.
 * @param task - Analytics task document
 * @returns Priority string or undefined if not found
 */
export function taskPriority(task: AnalyticsTaskDoc): string | undefined {
  const tagPriority = task.tags?.priority;
  if (tagPriority) {
    return tagPriority;
  }
  const title = task.title ?? '';
  const hashMatch = title.match(/#priority:([A-Za-z0-9_-]+)/);
  if (hashMatch) {
    return hashMatch[1];
  }
  const legacyMatch = title.match(/\bpriority:([A-Za-z0-9_-]+)/);
  return legacyMatch?.[1];
}

/**
 * Filters analytics tasks by agent and priority.
 * @param tasks - Array of analytics task documents
 * @param filters - Object containing optional agent and priority filters
 * @returns Filtered array of tasks matching criteria
 */
export function filterTasksForAnalytics<T extends AnalyticsTaskDoc>(
  tasks: readonly T[],
  filters: AnalyticsTaskFilters = {},
): T[] {
  return tasks.filter((task) => {
    if (filters.agent && task.assigneeId !== filters.agent) {
      return false;
    }
    if (filters.priority && taskPriority(task) !== filters.priority) {
      return false;
    }
    return true;
  });
}

/**
 * Filters work runs by agent using runnerHost field.
 * @param workRuns - Array of analytics work run documents
 * @param filters - Object containing optional agent filter
 * @returns Filtered array of work runs matching agent criteria
 */
export function filterWorkRunsForAnalytics<T extends AnalyticsWorkRunDoc>(
  workRuns: readonly T[],
  filters: Pick<AnalyticsTaskFilters, 'agent'> = {},
): T[] {
  if (!filters.agent) {
    return [...workRuns];
  }
  return workRuns.filter((run) => run.runnerHost === filters.agent);
}

/**
 * Create a list of {dayStart, dayEnd, dateStr} buckets covering the requested
 * number of days, going from oldest to newest.
 */
export function generateDayBuckets(
  now: number,
  days: number,
): { dayStart: number; dayEnd: number; dateStr: string }[] {
  const buckets: { dayStart: number; dayEnd: number; dateStr: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = now - (i + 1) * MS_PER_DAY;
    const dayEnd = now - i * MS_PER_DAY;
    const dateStr = new Date(dayEnd).toISOString().slice(0, 10);
    buckets.push({ dayStart, dayEnd, dateStr });
  }
  return buckets;
}

/**
 * Bucket tasks by date and count completed / failed / created per bucket.
 */
export function bucketCompletionTrends(
  tasks: readonly AnalyticsTaskDoc[],
  now: number,
  days: number,
): TrendBucket[] {
  if (tasks.length === 0) return [];

  return generateDayBuckets(now, days).map(({ dayStart, dayEnd, dateStr }) => {
    const dayTasks = tasks.filter(
      (t) => t.updatedAt > dayStart && t.updatedAt <= dayEnd,
    );
    return {
      date: dateStr,
      completed: dayTasks.filter((t) => t.status === 'done').length,
      failed: dayTasks.filter((t) => t.status === 'failed').length,
      created: dayTasks.length,
    };
  });
}

/**
 * Bucket work runs by agent and date, counting active and completed tasks.
 */
export function bucketAgentUtilization(
  workRuns: readonly AnalyticsWorkRunDoc[],
): UtilizationEntry[] {
  const agentMap = new Map<string, Map<string, { active: number; completed: number }>>();

  for (const run of workRuns) {
    const agent = run.runnerHost ?? 'unknown';
    const dateStr = new Date(run.startedAt).toISOString().slice(0, 10);
    const dateMap = agentMap.get(agent) ?? new Map();
    const entry = dateMap.get(dateStr) ?? { active: 0, completed: 0 };

    if (run.status === 'running') {
      entry.active++;
    } else if (run.status === 'succeeded' || run.status === 'failed') {
      entry.completed++;
    }

    dateMap.set(dateStr, entry);
    agentMap.set(agent, dateMap);
  }

  const result: UtilizationEntry[] = [];
  for (const [agent, dateMap] of agentMap) {
    for (const [date, stats] of dateMap) {
      result.push({
        agent,
        date,
        activeTasks: stats.active,
        completedTasks: stats.completed,
      });
    }
  }

  return result.sort(
    (a, b) => a.date.localeCompare(b.date) || a.agent.localeCompare(b.agent),
  );
}

/**
 * Group tasks by project + track, computing failure rate, avg duration,
 * and last activity timestamp. Sorted by worst bottlenecks first.
 */
export function computeBottlenecks(
  tasks: readonly AnalyticsTaskDoc[],
): BottleneckEntry[] {
  if (tasks.length === 0) return [];

  const groupMap = new Map<string, { tasks: AnalyticsTaskDoc[]; projectSlug: string; trackId: string }>();

  for (const task of tasks) {
    const projectSlug = task.projectSlug ?? 'unknown';
    const trackId = task.trackId ?? 'unknown';
    const key = `${projectSlug}::${trackId}`;
    const existing = groupMap.get(key);
    if (existing) {
      existing.tasks.push(task);
    } else {
      groupMap.set(key, { tasks: [task], projectSlug, trackId });
    }
  }

  const entries: BottleneckEntry[] = [];

  for (const { tasks: groupTasks, projectSlug, trackId } of groupMap.values()) {
    const totalTasks = groupTasks.length;
    const failedTasks = groupTasks.filter((t) => t.status === 'failed').length;
    const failureRate = totalTasks > 0 ? failedTasks / totalTasks : 0;

    const durations = groupTasks
      .filter((t) => t.startedAt != null)
      .map((t) => t.updatedAt - t.startedAt!);
    const avgDurationMs = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    const lastActivityAt = Math.max(...groupTasks.map((t) => t.updatedAt));

    entries.push({
      trackId,
      projectSlug,
      totalTasks,
      failedTasks,
      avgDurationMs,
      failureRate,
      lastActivityAt,
    });
  }

  entries.sort((a, b) => {
    if (b.failureRate !== a.failureRate) {
      return b.failureRate - a.failureRate;
    }
    return b.avgDurationMs - a.avgDurationMs;
  });

  return entries;
}

/**
 * Cumulative snapshot of queue depth: at each day's end, count pending /
 * in-progress / completed tasks seen up to that point.
 */
export function bucketQueueDepth(
  tasks: readonly AnalyticsTaskDoc[],
  now: number,
  days: number,
): QueueBucket[] {
  if (tasks.length === 0) return [];

  return generateDayBuckets(now, days).map(({ dayEnd, dateStr }) => {
    const dayTasks = tasks.filter((t) => t.updatedAt <= dayEnd);
    return {
      date: dateStr,
      pending: dayTasks.filter(
        (t) => t.status === 'todo' || t.status === 'backlog',
      ).length,
      inProgress: dayTasks.filter(
        (t) => t.status === 'in_progress' || t.status === 'review',
      ).length,
      completed: dayTasks.filter((t) => t.status === 'done').length,
    };
  });
}

const HOOK_PHASES = ['beforeRunHook', 'afterRunHook', 'afterCreateHook'];

/**
 * Compute hook execution and failure counts per phase per day.
 */
export function computeHookMetrics(
  errors: readonly OrchestratorErrorDoc[],
  now: number,
  days: number,
): HookMetricEntry[] {
  const hookErrors = errors.filter((e) =>
    HOOK_PHASES.some((phase) => e.operation.includes(phase)),
  );
  if (hookErrors.length === 0) return [];

  const result: HookMetricEntry[] = [];

  for (const { dayStart, dayEnd, dateStr } of generateDayBuckets(now, days)) {
    for (const phase of HOOK_PHASES) {
      const dayErrors = hookErrors.filter(
        (e) =>
          e.operation.includes(phase) &&
          e.createdAt > dayStart &&
          e.createdAt <= dayEnd,
      );
      result.push({
        date: dateStr,
        phase,
        executions: dayErrors.length,
        failures: dayErrors.filter((e) => e.severity === 'fatal').length,
      });
    }
  }

  return result;
}

/**
 * Compute session resumption metrics: total tasks, tasks bound to sessions,
 * resumption rate, active sessions, and per-date breakdown.
 */
export function computeSessionMetrics(
  tasks: readonly AnalyticsTaskDoc[],
  now: number,
  days: number,
): SessionMetricsEntry {
  const sessionTasks = tasks.filter((t) => t.sessionId);
  const activeSessions = sessionTasks.filter(
    (t) => t.status === 'in_progress',
  ).length;

  const byDate: SessionByDate[] = sessionTasks.length === 0
    ? []
    : generateDayBuckets(now, days).map(({ dayStart, dayEnd, dateStr }) => {
      const dayTasks = tasks.filter(
        (t) => t.updatedAt > dayStart && t.updatedAt <= dayEnd,
      );
      const newSessions = dayTasks.filter(
        (t) =>
          t.sessionId &&
          t.startedAt &&
          t.startedAt > dayStart &&
          t.startedAt <= dayEnd,
      ).length;
      const resumedSessions = dayTasks.filter(
        (t) => t.sessionId && t.startedAt && t.startedAt <= dayStart,
      ).length;

      return { date: dateStr, newSessions, resumedSessions };
    });

  return {
    totalTasks: tasks.length,
    sessionBoundTasks: sessionTasks.length,
    resumptionRate: tasks.length > 0 ? sessionTasks.length / tasks.length : 0,
    activeSessions,
    byDate,
  };
}
