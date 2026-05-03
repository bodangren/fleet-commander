import { describe, expect, it } from 'bun:test';
import {
  bucketCompletionTrends,
  bucketAgentUtilization,
  computeBottlenecks,
  bucketQueueDepth,
  computeHookMetrics,
  computeSessionMetrics,
  generateDayBuckets,
  filterTasksForAnalytics,
  filterWorkRunsForAnalytics,
  taskPriority,
  type TaskDoc,
  type WorkRunDoc,
  type OrchestratorErrorDoc,
} from './analytics';

// ─── helpers ──────────────────────────────────────────

function makeTask(overrides: Partial<TaskDoc> = {}): TaskDoc {
  return {
    projectSlug: 'proj',
    trackId: 'track-1',
    taskKey: 't1',
    status: 'todo',
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeWorkRun(overrides: Partial<WorkRunDoc> = {}): WorkRunDoc {
  return {
    runnerHost: 'agent-a',
    status: 'running',
    startedAt: Date.now(),
    ...overrides,
  };
}

function makeErrorDoc(overrides: Partial<OrchestratorErrorDoc> = {}): OrchestratorErrorDoc {
  return {
    operation: 'beforeRunHook',
    severity: 'warning',
    createdAt: Date.now(),
    ...overrides,
  };
}

// ─── generateDayBuckets ──────────────────────────────

describe('generateDayBuckets', () => {
  it('produces correct number of buckets', () => {
    const now = new Date('2026-05-15T12:00:00Z').getTime();
    const buckets = generateDayBuckets(now, 3);
    expect(buckets).toHaveLength(3);
  });

  it('buckets are in chronological order', () => {
    const now = new Date('2026-05-15T12:00:00Z').getTime();
    const buckets = generateDayBuckets(now, 3);
    expect(buckets[0].dateStr).toBe('2026-05-13');
    expect(buckets[1].dateStr).toBe('2026-05-14');
    expect(buckets[2].dateStr).toBe('2026-05-15');
  });

  it('handles single day', () => {
    const now = new Date('2026-05-15T00:00:00Z').getTime();
    const buckets = generateDayBuckets(now, 1);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].dateStr).toBe('2026-05-15');
  });

  it('day boundaries do not overlap', () => {
    const now = new Date('2026-05-15T12:00:00Z').getTime();
    const buckets = generateDayBuckets(now, 2);
    expect(buckets[0].dayEnd).toBe(buckets[1].dayStart);
  });

  it('handles month boundary correctly', () => {
    const now = new Date('2026-06-01T12:00:00Z').getTime();
    const buckets = generateDayBuckets(now, 3);
    expect(buckets[0].dateStr).toBe('2026-05-30');
    expect(buckets[1].dateStr).toBe('2026-05-31');
    expect(buckets[2].dateStr).toBe('2026-06-01');
  });
});

// ─── bucketCompletionTrends ──────────────────────────

describe('bucketCompletionTrends', () => {
  const BASE = new Date('2026-05-15T12:00:00Z').getTime();
  const DAY = 86400000;

  it('returns all-zero buckets for empty tasks', () => {
    const result = bucketCompletionTrends([], BASE, 3);
    expect(result).toHaveLength(3);
    for (const b of result) {
      expect(b.completed).toBe(0);
      expect(b.failed).toBe(0);
      expect(b.created).toBe(0);
    }
  });

  it('places completed task in correct day bucket', () => {
    const task = makeTask({
      status: 'done',
      updatedAt: BASE - 2 * 3600000, // 2 hours before base
    });
    const result = bucketCompletionTrends([task], BASE, 3);
    const today = result[2]; // last bucket = today
    expect(today.completed).toBe(1);
    expect(today.created).toBe(1);
  });

  it('places failed task in correct bucket', () => {
    const task = makeTask({
      status: 'failed',
      updatedAt: BASE - 25 * 3600000, // 25 hours ago → yesterday
    });
    const result = bucketCompletionTrends([task], BASE, 3);
    const yesterday = result[1];
    expect(yesterday.failed).toBe(1);
    expect(yesterday.completed).toBe(0);
  });

  it('counts multiple tasks in same bucket', () => {
    const tasks: TaskDoc[] = [
      makeTask({ status: 'done', updatedAt: BASE - 3600000 }),
      makeTask({ taskKey: 't2', status: 'done', updatedAt: BASE - 1800000 }),
      makeTask({ taskKey: 't3', status: 'failed', updatedAt: BASE - 3600000 }),
    ];
    const result = bucketCompletionTrends(tasks, BASE, 1);
    expect(result[0].completed).toBe(2);
    expect(result[0].failed).toBe(1);
    expect(result[0].created).toBe(3);
  });

  it('excludes tasks outside the window', () => {
    const task = makeTask({
      status: 'done',
      updatedAt: BASE - 5 * DAY, // 5 days ago, outside 3-day window
    });
    const result = bucketCompletionTrends([task], BASE, 3);
    for (const b of result) {
      expect(b.created).toBe(0);
    }
  });

  it('task at exact dayEnd boundary is included', () => {
    // Day end = BASE. A task at exactly BASE should be included.
    const task = makeTask({ status: 'done', updatedAt: BASE });
    const result = bucketCompletionTrends([task], BASE, 1);
    expect(result[0].created).toBe(1);
  });

  it('task at exact dayStart is excluded (strict gt)', () => {
    // dayStart = BASE - DAY. task at dayStart → not included.
    const task = makeTask({ status: 'done', updatedAt: BASE - DAY });
    const result = bucketCompletionTrends([task], BASE, 1);
    expect(result[0].created).toBe(0);
  });
});

describe('analytics filters', () => {
  it('extracts priority from tag metadata, hash tags, and legacy title labels', () => {
    expect(taskPriority(makeTask({ tags: { priority: 'critical' } }))).toBe('critical');
    expect(taskPriority(makeTask({ title: 'Build UI #priority:high' }))).toBe('high');
    expect(taskPriority(makeTask({ title: 'priority:low Cleanup' }))).toBe('low');
  });

  it('filters tasks by assignee and priority', () => {
    const tasks = [
      makeTask({ taskKey: 'a', assignee: 'agent-a', title: 'A #priority:high' }),
      makeTask({ taskKey: 'b', assignee: 'agent-b', title: 'B #priority:high' }),
      makeTask({ taskKey: 'c', assignee: 'agent-a', title: 'C #priority:low' }),
    ];

    const result = filterTasksForAnalytics(tasks, {
      agent: 'agent-a',
      priority: 'high',
    });

    expect(result.map((task) => task.taskKey)).toEqual(['a']);
  });

  it('filters work runs by runner host', () => {
    const runs = [
      makeWorkRun({ runnerHost: 'agent-a' }),
      makeWorkRun({ runnerHost: 'agent-b' }),
    ];

    const result = filterWorkRunsForAnalytics(runs, { agent: 'agent-b' });

    expect(result.map((run) => run.runnerHost)).toEqual(['agent-b']);
  });
});

// ─── bucketAgentUtilization ──────────────────────────

describe('bucketAgentUtilization', () => {
  const BASE = new Date('2026-05-15T12:00:00Z').getTime();

  it('returns empty array for no runs', () => {
    expect(bucketAgentUtilization([])).toEqual([]);
  });

  it('groups runs by agent', () => {
    const runs: WorkRunDoc[] = [
      makeWorkRun({ runnerHost: 'agent-a', status: 'succeeded', startedAt: BASE - 3600000 }),
      makeWorkRun({ runnerHost: 'agent-b', status: 'running', startedAt: BASE - 3600000 }),
    ];
    const result = bucketAgentUtilization(runs);
    const agents = [...new Set(result.map((r) => r.agent))];
    expect(agents.sort()).toEqual(['agent-a', 'agent-b']);
  });

  it('defaults to unknown for missing runnerHost', () => {
    const runs: WorkRunDoc[] = [
      { status: 'running', startedAt: BASE },
    ];
    const result = bucketAgentUtilization(runs);
    expect(result[0].agent).toBe('unknown');
  });

  it('counts active (running) separately from completed', () => {
    const runs: WorkRunDoc[] = [
      makeWorkRun({ status: 'running', startedAt: BASE }),
      makeWorkRun({ status: 'succeeded', startedAt: BASE }),
      makeWorkRun({ status: 'failed', startedAt: BASE }),
    ];
    const result = bucketAgentUtilization(runs);
    expect(result).toHaveLength(1); // one agent, one date
    expect(result[0].activeTasks).toBe(1);
    expect(result[0].completedTasks).toBe(2);
  });

  it('ignores non-standard statuses in completed count', () => {
    const runs: WorkRunDoc[] = [
      makeWorkRun({ status: 'cancelled', startedAt: BASE }),
    ];
    const result = bucketAgentUtilization(runs);
    expect(result[0].completedTasks).toBe(0);
    expect(result[0].activeTasks).toBe(0);
  });

  it('sorted by date then agent', () => {
    const DAY = 86400000;
    const runs: WorkRunDoc[] = [
      makeWorkRun({ runnerHost: 'b', status: 'succeeded', startedAt: BASE }),
      makeWorkRun({ runnerHost: 'a', status: 'succeeded', startedAt: BASE - DAY }),
    ];
    const result = bucketAgentUtilization(runs);
    expect(result[0].date < result[1].date).toBe(true);
  });
});

// ─── computeBottlenecks ──────────────────────────────

describe('computeBottlenecks', () => {
  it('returns empty array for no tasks', () => {
    expect(computeBottlenecks([])).toEqual([]);
  });

  it('groups tasks by project and track', () => {
    const tasks: TaskDoc[] = [
      makeTask({ projectSlug: 'p1', trackId: 't1', taskKey: 'k1', status: 'done' }),
      makeTask({ projectSlug: 'p1', trackId: 't1', taskKey: 'k2', status: 'failed' }),
      makeTask({ projectSlug: 'p2', trackId: 't2', taskKey: 'k3', status: 'done' }),
    ];
    const result = computeBottlenecks(tasks);
    expect(result).toHaveLength(2);
  });

  it('computes failure rate correctly', () => {
    const tasks: TaskDoc[] = [
      makeTask({ taskKey: 'k1', status: 'done' }),
      makeTask({ taskKey: 'k2', status: 'failed' }),
    ];
    const result = computeBottlenecks(tasks);
    expect(result[0].failureRate).toBeCloseTo(0.5);
    expect(result[0].totalTasks).toBe(2);
    expect(result[0].failedTasks).toBe(1);
  });

  it('handles zero division gracefully', () => {
    const result = computeBottlenecks([
      makeTask({ status: 'todo' }),
    ]);
    expect(result[0].failureRate).toBe(0);
    expect(result[0].totalTasks).toBe(1);
  });

  it('computes average duration from startedAt and updatedAt', () => {
    const now = Date.now();
    const tasks: TaskDoc[] = [
      makeTask({ taskKey: 'k1', startedAt: 1000, updatedAt: 5000 }),
      makeTask({ taskKey: 'k2', startedAt: 2000, updatedAt: 6000 }),
    ];
    const result = computeBottlenecks(tasks);
    expect(result[0].avgDurationMs).toBe(4000); // (4000+4000)/2
  });

  it('skips duration when startedAt is missing', () => {
    const tasks: TaskDoc[] = [
      makeTask({ taskKey: 'k1', startedAt: 1000, updatedAt: 5000 }),
      makeTask({ taskKey: 'k2', updatedAt: 5000 }), // no startedAt
    ];
    const result = computeBottlenecks(tasks);
    expect(result[0].avgDurationMs).toBe(4000); // only one duration
  });

  it('sorts by worst failure rate first', () => {
    const tasks: TaskDoc[] = [
      makeTask({ trackId: 'safe', taskKey: 'k1', status: 'done' }),
      makeTask({ trackId: 'risky', taskKey: 'k2', status: 'failed' }),
    ];
    const result = computeBottlenecks(tasks);
    expect(result[0].trackId).toBe('risky');
  });

  it('breaks ties by avgDurationMs (descending)', () => {
    const now = Date.now();
    const tasks: TaskDoc[] = [
      makeTask({ trackId: 'slow', taskKey: 'k1', startedAt: 1000, updatedAt: 11000, status: 'done' }),
      makeTask({ trackId: 'fast', taskKey: 'k2', startedAt: 1000, updatedAt: 3000, status: 'done' }),
    ];
    const result = computeBottlenecks(tasks);
    // both have failureRate=0, but slow has higher avgDuration
    expect(result[0].trackId).toBe('slow');
  });

  it('tracks last activity timestamp', () => {
    const early = 1000;
    const late = 5000;
    const tasks: TaskDoc[] = [
      makeTask({ taskKey: 'k1', updatedAt: early }),
      makeTask({ taskKey: 'k2', updatedAt: late }),
    ];
    const result = computeBottlenecks(tasks);
    expect(result[0].lastActivityAt).toBe(late);
  });
});

// ─── bucketQueueDepth ────────────────────────────────

describe('bucketQueueDepth', () => {
  const BASE = new Date('2026-05-15T12:00:00Z').getTime();
  const DAY = 86400000;

  it('returns all-zero for empty tasks', () => {
    const result = bucketQueueDepth([], BASE, 3);
    expect(result).toHaveLength(3);
    for (const b of result) {
      expect(b.pending).toBe(0);
      expect(b.inProgress).toBe(0);
      expect(b.completed).toBe(0);
    }
  });

  it('counts cumulative pending tasks', () => {
    const tasks: TaskDoc[] = [
      makeTask({ taskKey: 'k1', status: 'todo', updatedAt: BASE - DAY }),
    ];
    const result = bucketQueueDepth(tasks, BASE, 3);
    // Last two buckets should include the todo task (it was created before them)
    expect(result[1].pending).toBe(1);
    expect(result[2].pending).toBe(1);
    // First bucket = day before task was created → 0
    expect(result[0].pending).toBe(0);
  });

  it('counts in-progress as inProgress', () => {
    const tasks: TaskDoc[] = [
      makeTask({ taskKey: 'k1', status: 'in_progress', updatedAt: BASE - 3600000 }),
    ];
    const result = bucketQueueDepth(tasks, BASE, 1);
    expect(result[0].inProgress).toBe(1);
    expect(result[0].pending).toBe(0);
  });

  it('counts review status as inProgress', () => {
    const tasks: TaskDoc[] = [
      makeTask({ taskKey: 'k1', status: 'review', updatedAt: BASE - 3600000 }),
    ];
    const result = bucketQueueDepth(tasks, BASE, 1);
    expect(result[0].inProgress).toBe(1);
  });

  it('counts backlog as pending', () => {
    const tasks: TaskDoc[] = [
      makeTask({ taskKey: 'k1', status: 'backlog', updatedAt: BASE }),
    ];
    const result = bucketQueueDepth(tasks, BASE, 1);
    expect(result[0].pending).toBe(1);
  });

  it('done tasks not counted as pending or inProgress', () => {
    const tasks: TaskDoc[] = [
      makeTask({ taskKey: 'k1', status: 'done', updatedAt: BASE - 3600000 }),
    ];
    const result = bucketQueueDepth(tasks, BASE, 1);
    expect(result[0].completed).toBe(1);
    expect(result[0].pending).toBe(0);
    expect(result[0].inProgress).toBe(0);
  });

  it('accumulates over time (cumulative snapshots)', () => {
    // Task created day 1, completed day 3 — it should appear as pending when
    // snapshot is taken at day 1 end, and as completed at day 3 end.
    const tasks: TaskDoc[] = [
      makeTask({ taskKey: 'k1', status: 'todo', updatedAt: BASE - 3 * DAY + 3600000 }),
      makeTask({ taskKey: 'k1', status: 'done', updatedAt: BASE - 3600000 }),
    ];
    const result = bucketQueueDepth(tasks, BASE, 3);
    // The task appears twice: once as todo in earlier snapshot, once as done in later
    expect(result[2].completed).toBe(1);
    expect(result[2].pending).toBe(1); // both versions are <= dayEnd
  });
});

// ─── computeHookMetrics ──────────────────────────────

describe('computeHookMetrics', () => {
  const BASE = new Date('2026-05-15T12:00:00Z').getTime();
  const DAY = 86400000;

  it('returns empty entries for no errors', () => {
    const result = computeHookMetrics([], BASE, 1);
    expect(result).toHaveLength(3); // 3 phases × 1 day
    for (const e of result) {
      expect(e.executions).toBe(0);
      expect(e.failures).toBe(0);
    }
  });

  it('filters out non-hook operations', () => {
    const errors: OrchestratorErrorDoc[] = [
      makeErrorDoc({ operation: 'dispatchTask', createdAt: BASE - 3600000 }),
    ];
    const result = computeHookMetrics(errors, BASE, 1);
    for (const e of result) {
      expect(e.executions).toBe(0);
    }
  });

  it('counts hook executions per phase per day', () => {
    const errors: OrchestratorErrorDoc[] = [
      makeErrorDoc({ operation: 'beforeRunHook', severity: 'warning', createdAt: BASE - 3600000 }),
      makeErrorDoc({ operation: 'beforeRunHook', severity: 'debug', createdAt: BASE - 1800000 }),
    ];
    const result = computeHookMetrics(errors, BASE, 1);
    const beforeRun = result.find((e) => e.phase === 'beforeRunHook')!;
    expect(beforeRun.executions).toBe(2);
    expect(beforeRun.failures).toBe(0); // neither is fatal
  });

  it('counts fatal as failures', () => {
    const errors: OrchestratorErrorDoc[] = [
      makeErrorDoc({ operation: 'afterRunHook', severity: 'fatal', createdAt: BASE - 3600000 }),
      makeErrorDoc({ operation: 'afterRunHook', severity: 'warning', createdAt: BASE - 3600000 }),
    ];
    const result = computeHookMetrics(errors, BASE, 1);
    const afterRun = result.find((e) => e.phase === 'afterRunHook')!;
    expect(afterRun.executions).toBe(2);
    expect(afterRun.failures).toBe(1);
  });

  it('spreads errors across correct days', () => {
    // Day 0: BASE-3*DAY to BASE-2*DAY (May 12)
    // Day 1: BASE-2*DAY to BASE-1*DAY (May 13)
    // Day 2: BASE-1*DAY to BASE         (May 14)
    const errors: OrchestratorErrorDoc[] = [
      // falls in day 1 (May 13 13:00 > May 12 12:00 dayStart, <= May 13 12:00 dayEnd)
      makeErrorDoc({ operation: 'beforeRunHook', createdAt: BASE - 2 * DAY + 3600000 }),
      // falls in day 2 (May 14 11:00)
      makeErrorDoc({ operation: 'beforeRunHook', createdAt: BASE - 3600000 }),
    ];
    const result = computeHookMetrics(errors, BASE, 3);
    // result[3] = day 1, phase beforeRunHook
    // result[6] = day 2, phase beforeRunHook
    expect(result[3].executions).toBe(1);
    expect(result[6].executions).toBe(1);
  });

  it('returns all three phases for every day', () => {
    const result = computeHookMetrics([], BASE, 2);
    expect(result).toHaveLength(6); // 3 phases × 2 days
    const phases = [...new Set(result.map((e) => e.phase))];
    expect(phases.sort()).toEqual(['afterCreateHook', 'afterRunHook', 'beforeRunHook']);
  });

  it('handles exact day boundary', () => {
    const errors: OrchestratorErrorDoc[] = [
      makeErrorDoc({ operation: 'beforeRunHook', createdAt: BASE }),
    ];
    const result = computeHookMetrics(errors, BASE, 1);
    const beforeRun = result.find((e) => e.phase === 'beforeRunHook')!;
    expect(beforeRun.executions).toBe(1); // createdAt === dayEnd → included (<=)
  });

  it('excludes errors at dayStart', () => {
    const dayStart = BASE - DAY;
    const errors: OrchestratorErrorDoc[] = [
      makeErrorDoc({ operation: 'beforeRunHook', createdAt: dayStart }),
    ];
    const result = computeHookMetrics(errors, BASE, 1);
    const beforeRun = result.find((e) => e.phase === 'beforeRunHook')!;
    expect(beforeRun.executions).toBe(0); // createdAt === dayStart → excluded (strict gt)
  });
});

// ─── computeSessionMetrics ───────────────────────────

describe('computeSessionMetrics', () => {
  const BASE = new Date('2026-05-15T12:00:00Z').getTime();
  const DAY = 86400000;

  it('returns all-zero for empty tasks', () => {
    const result = computeSessionMetrics([], BASE, 3);
    expect(result.totalTasks).toBe(0);
    expect(result.sessionBoundTasks).toBe(0);
    expect(result.resumptionRate).toBe(0);
    expect(result.activeSessions).toBe(0);
    expect(result.byDate).toHaveLength(3);
  });

  it('counts total and session-bound tasks', () => {
    const tasks: TaskDoc[] = [
      makeTask({ taskKey: 'k1' }),
      makeTask({ taskKey: 'k2', sessionId: 'sess-1' }),
    ];
    const result = computeSessionMetrics(tasks, BASE, 1);
    expect(result.totalTasks).toBe(2);
    expect(result.sessionBoundTasks).toBe(1);
    expect(result.resumptionRate).toBeCloseTo(0.5);
  });

  it('handles zero total tasks gracefully', () => {
    const result = computeSessionMetrics([], BASE, 1);
    expect(result.resumptionRate).toBe(0);
  });

  it('counts active sessions (in_progress with sessionId)', () => {
    const tasks: TaskDoc[] = [
      makeTask({ taskKey: 'k1', sessionId: 'sess-1', status: 'in_progress' }),
      makeTask({ taskKey: 'k2', sessionId: 'sess-2', status: 'done' }),
      makeTask({ taskKey: 'k3', status: 'in_progress' }), // no sessionId, shouldn't count
    ];
    const result = computeSessionMetrics(tasks, BASE, 1);
    expect(result.activeSessions).toBe(1);
  });

  it('identifies new vs resumed sessions by startedAt', () => {
    const tasks: TaskDoc[] = [
      makeTask({
        taskKey: 'k1',
        sessionId: 'sess-1',
        startedAt: BASE - 3600000, // started today
        updatedAt: BASE,
      }),
      makeTask({
        taskKey: 'k2',
        sessionId: 'sess-2',
        startedAt: BASE - 2 * DAY, // started 2 days ago
        updatedAt: BASE,
      }),
    ];
    const result = computeSessionMetrics(tasks, BASE, 3);
    // tasks are in byDate[2] (today) since updatedAt matches today
    const todayBucket = result.byDate[2];
    expect(todayBucket.newSessions).toBe(1); // k1 started today
    expect(todayBucket.resumedSessions).toBe(1); // k2 started before today
  });

  it('ignores tasks without startedAt for session classification', () => {
    const tasks: TaskDoc[] = [
      makeTask({ taskKey: 'k1', sessionId: 'sess-1', updatedAt: BASE }), // no startedAt
    ];
    const result = computeSessionMetrics(tasks, BASE, 1);
    const bucket = result.byDate[0];
    expect(bucket.newSessions).toBe(0);
    expect(bucket.resumedSessions).toBe(0);
  });

  it('tasks without sessionId do not affect new/resumed counts', () => {
    const tasks: TaskDoc[] = [
      makeTask({ taskKey: 'k1', startedAt: BASE, updatedAt: BASE }), // no sessionId
    ];
    const result = computeSessionMetrics(tasks, BASE, 1);
    expect(result.byDate[0].newSessions).toBe(0);
    expect(result.byDate[0].resumedSessions).toBe(0);
    expect(result.sessionBoundTasks).toBe(0);
  });

  it('byDate length matches days parameter', () => {
    const result = computeSessionMetrics([makeTask()], BASE, 7);
    expect(result.byDate).toHaveLength(7);
  });
});
