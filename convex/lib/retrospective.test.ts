import { describe, expect, it } from 'bun:test';
import {
  aggregateSprintData,
  extractTags,
  type SprintDoc,
  type TaskDoc,
  type WorkRunDoc,
  type IssueDoc,
  type ExecutionLogDoc,
  type OrchestratorErrorDoc,
} from './retrospective';

// ─── helpers ──────────────────────────────────────────

function makeSprint(overrides: Partial<SprintDoc> = {}): SprintDoc {
  return {
    projectSlug: 'proj',
    name: 'Sprint 1',
    status: 'active',
    startDate: new Date('2026-05-01').getTime(),
    endDate: new Date('2026-05-14').getTime(),
    taskKeys: ['t1', 't2', 't3'],
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeTask(overrides: Partial<TaskDoc> = {}): TaskDoc {
  return {
    taskKey: 't1',
    projectSlug: 'proj',
    trackId: 'track-1',
    title: 'A task',
    status: 'todo',
    dependencies: [],
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeWorkRun(overrides: Partial<WorkRunDoc> = {}): WorkRunDoc {
  return {
    runId: 'r1',
    projectSlug: 'proj',
    status: 'succeeded',
    startedAt: Date.now(),
    ...overrides,
  };
}

function makeIssue(overrides: Partial<IssueDoc> = {}): IssueDoc {
  return {
    issueId: 'i1',
    projectSlug: 'proj',
    title: 'Bug: something broke',
    body: 'details',
    status: 'open',
    openedAt: Date.now(),
    ...overrides,
  };
}

function makeLog(overrides: Partial<ExecutionLogDoc> = {}): ExecutionLogDoc {
  return {
    runId: 'r1',
    projectSlug: 'proj',
    status: 'succeeded',
    summary: 'ok',
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeError(overrides: Partial<OrchestratorErrorDoc> = {}): OrchestratorErrorDoc {
  return {
    projectSlug: 'proj',
    operation: 'beforeRunHook',
    severity: 'warning',
    message: 'hook failed',
    createdAt: Date.now(),
    ...overrides,
  };
}

// ─── extractTags ──────────────────────────────────────

describe('extractTags', () => {
  it('parses priority tag from title', () => {
    const tags = extractTags('Build feature #priority:critical');
    expect(tags.priority).toBe('critical');
  });

  it('parses multiple tags', () => {
    const tags = extractTags('Fix bug #priority:high #blocked_by:t1');
    expect(tags.priority).toBe('high');
    expect(tags.blocked_by).toBe('t1');
  });

  it('returns empty object when no tags', () => {
    expect(extractTags('Plain title')).toEqual({});
  });
});

// ─── aggregateSprintData ──────────────────────────────

describe('aggregateSprintData', () => {
  it('counts planned tasks from sprint taskKeys', () => {
    const sprint = makeSprint({ taskKeys: ['a', 'b', 'c'] });
    const result = aggregateSprintData(sprint, [], [], [], [], []);
    expect(result.taskCounts.planned).toBe(3);
  });

  it('counts completed and blocked tasks', () => {
    const sprint = makeSprint({
      taskKeys: ['t1', 't2', 't3'],
    });
    const tasks = [
      makeTask({ taskKey: 't1', status: 'done' }),
      makeTask({ taskKey: 't2', status: 'blocked' }),
      makeTask({ taskKey: 't3', status: 'in_progress' }),
    ];
    const result = aggregateSprintData(sprint, tasks, [], [], [], []);
    expect(result.taskCounts.completed).toBe(1);
    expect(result.taskCounts.blocked).toBe(1);
    expect(result.taskCounts.carriedOver).toBe(2);
  });

  it('counts failed tasks from failed workRuns and retryCount', () => {
    const sprint = makeSprint({ taskKeys: ['t1', 't2'] });
    const tasks = [
      makeTask({ taskKey: 't1', status: 'done' }),
      makeTask({ taskKey: 't2', status: 'todo', retryCount: 2 }),
    ];
    const workRuns = [
      makeWorkRun({ selectedTaskKey: 't2', status: 'failed' }),
    ];
    const result = aggregateSprintData(sprint, tasks, workRuns, [], [], []);
    expect(result.taskCounts.failed).toBe(1);
  });

  it('computes agent workload distribution', () => {
    const sprint = makeSprint({ taskKeys: ['t1', 't2'] });
    const tasks = [
      makeTask({ taskKey: 't1', assignee: 'agent-a', status: 'done', startedAt: 0, updatedAt: 1000 }),
      makeTask({ taskKey: 't2', assignee: 'agent-b', status: 'todo' }),
    ];
    const result = aggregateSprintData(sprint, tasks, [], [], [], []);
    expect(result.agentWorkload).toHaveLength(2);
    const a = result.agentWorkload.find((x) => x.agent === 'agent-a');
    expect(a!.tasksAssigned).toBe(1);
    expect(a!.tasksCompleted).toBe(1);
    expect(a!.avgDurationMs).toBe(1000);
  });

  it('groups issues by pattern prefix', () => {
    const sprint = makeSprint();
    const issues = [
      makeIssue({ title: 'TypeError: cannot read' }),
      makeIssue({ title: 'TypeError: undefined is not' }),
      makeIssue({ title: 'Network: timeout' }),
    ];
    const result = aggregateSprintData(sprint, [], [], issues, [], []);
    expect(result.issuePatterns).toHaveLength(2);
    const typeError = result.issuePatterns.find((p) => p.pattern === 'typeerror');
    expect(typeError!.count).toBe(2);
  });

  it('computes velocity metrics', () => {
    const sprint = makeSprint({ taskKeys: ['t1', 't2', 't3', 't4'] });
    const tasks = [
      makeTask({ taskKey: 't1', status: 'done' }),
      makeTask({ taskKey: 't2', status: 'done' }),
      makeTask({ taskKey: 't3', status: 'blocked' }),
      makeTask({ taskKey: 't4', status: 'todo' }),
    ];
    const result = aggregateSprintData(sprint, tasks, [], [], [], []);
    expect(result.velocity.planned).toBe(4);
    expect(result.velocity.completed).toBe(2);
    expect(result.velocity.completionRate).toBe(0.5);
  });

  it('aggregates hook failures by phase', () => {
    const sprint = makeSprint();
    const errors = [
      makeError({ operation: 'beforeRunHook', severity: 'fatal' }),
      makeError({ operation: 'beforeRunHook', severity: 'fatal' }),
      makeError({ operation: 'afterRunHook', severity: 'warning' }),
    ];
    const result = aggregateSprintData(sprint, [], [], [], [], errors);
    const before = result.hookFailures.find((h) => h.phase === 'beforeRunHook');
    expect(before!.count).toBe(2);
    const after = result.hookFailures.find((h) => h.phase === 'afterRunHook');
    expect(after!.count).toBe(1);
  });

  it('computes session continuation rate', () => {
    const sprint = makeSprint({ taskKeys: ['t1', 't2', 't3'] });
    const tasks = [
      makeTask({ taskKey: 't1', sessionId: 's1' }),
      makeTask({ taskKey: 't2', sessionId: 's1' }),
      makeTask({ taskKey: 't3', sessionId: 's2' }),
    ];
    const result = aggregateSprintData(sprint, tasks, [], [], [], []);
    expect(result.sessionMetrics.totalSessions).toBe(2);
    expect(result.sessionMetrics.resumedSessions).toBe(1);
    expect(result.sessionMetrics.continuationRate).toBe(0.5);
  });

  it('correlates priority tags with completion rate', () => {
    const sprint = makeSprint({ taskKeys: ['t1', 't2', 't3'] });
    const tasks = [
      makeTask({ taskKey: 't1', title: 'A #priority:critical', status: 'done', startedAt: 0, updatedAt: 100 }),
      makeTask({ taskKey: 't2', title: 'B #priority:critical', status: 'todo', startedAt: 0, updatedAt: 200 }),
      makeTask({ taskKey: 't3', title: 'C #priority:low', status: 'done', startedAt: 0, updatedAt: 500 }),
    ];
    const result = aggregateSprintData(sprint, tasks, [], [], [], []);
    const critical = result.priorityCorrelation.find((p) => p.priority === 'critical');
    expect(critical!.total).toBe(2);
    expect(critical!.completed).toBe(1);
    expect(critical!.completionRate).toBe(0.5);
    expect(critical!.avgCycleTimeMs).toBe(150);
  });

  it('extracts blocked_by chains with cycle times', () => {
    const sprint = makeSprint({ taskKeys: ['t1', 't2'] });
    const tasks = [
      makeTask({ taskKey: 't1', title: 'A #blocked_by:t0', startedAt: 0, updatedAt: 100 }),
      makeTask({ taskKey: 't2', title: 'B' }),
    ];
    const result = aggregateSprintData(sprint, tasks, [], [], [], []);
    expect(result.blockedByChains).toHaveLength(1);
    expect(result.blockedByChains[0].taskKey).toBe('t1');
    expect(result.blockedByChains[0].blockerCount).toBe(1);
    expect(result.blockedByChains[0].cycleTimeMs).toBe(100);
  });

  it('collects top errors from logs and orchestrator errors', () => {
    const sprint = makeSprint();
    const logs = [
      makeLog({ status: 'failed', summary: 'Connection refused\nat line 42' }),
      makeLog({ status: 'failed', summary: 'Connection refused\nat line 99' }),
    ];
    const errors = [
      makeError({ projectSlug: 'proj', severity: 'fatal', message: 'Connection refused' }),
    ];
    const result = aggregateSprintData(sprint, [], [], [], logs, errors);
    const top = result.topErrors.find((e) => e.message.includes('Connection refused'));
    expect(top!.count).toBe(3);
  });

  it('filters data to sprint project scope', () => {
    const sprint = makeSprint({ projectSlug: 'alpha', taskKeys: ['t1'] });
    const tasks = [makeTask({ taskKey: 't1', projectSlug: 'alpha', status: 'done' })];
    const otherIssues = [makeIssue({ projectSlug: 'beta', title: 'Other bug' })];
    const result = aggregateSprintData(sprint, tasks, [], otherIssues, [], []);
    expect(result.issuePatterns).toHaveLength(0);
    expect(result.taskCounts.completed).toBe(1);
  });

  it('validates consistency across 3 consecutive sprints', () => {
    // Sprint 1: high completion, no blockers
    const sprint1 = makeSprint({
      name: 'Sprint 1',
      taskKeys: ['s1-t1', 's1-t2', 's1-t3', 's1-t4'],
    });
    const tasks1 = [
      makeTask({ taskKey: 's1-t1', status: 'done', assignee: 'agent-a', startedAt: 0, updatedAt: 100 }),
      makeTask({ taskKey: 's1-t2', status: 'done', assignee: 'agent-a', startedAt: 0, updatedAt: 200 }),
      makeTask({ taskKey: 's1-t3', status: 'done', assignee: 'agent-b', startedAt: 0, updatedAt: 150 }),
      makeTask({ taskKey: 's1-t4', status: 'done', assignee: 'agent-b', startedAt: 0, updatedAt: 180 }),
    ];
    const result1 = aggregateSprintData(sprint1, tasks1, [], [], [], []);
    expect(result1.velocity.completionRate).toBe(1);
    expect(result1.taskCounts.carriedOver).toBe(0);

    // Sprint 2: mixed, with blockers and failures
    const sprint2 = makeSprint({
      name: 'Sprint 2',
      taskKeys: ['s2-t1', 's2-t2', 's2-t3'],
    });
    const tasks2 = [
      makeTask({ taskKey: 's2-t1', status: 'done' }),
      makeTask({ taskKey: 's2-t2', status: 'blocked' }),
      makeTask({ taskKey: 's2-t3', status: 'todo', retryCount: 1 }),
    ];
    const workRuns2 = [makeWorkRun({ selectedTaskKey: 's2-t3', status: 'failed' })];
    const result2 = aggregateSprintData(sprint2, tasks2, workRuns2, [], [], []);
    expect(result2.velocity.completionRate).toBeCloseTo(0.333, 2);
    expect(result2.taskCounts.blocked).toBe(1);
    expect(result2.taskCounts.failed).toBe(1);

    // Sprint 3: priority correlation and session metrics
    const sprint3 = makeSprint({
      name: 'Sprint 3',
      taskKeys: ['s3-t1', 's3-t2', 's3-t3'],
    });
    const tasks3 = [
      makeTask({ taskKey: 's3-t1', title: 'A #priority:critical', status: 'done', startedAt: 0, updatedAt: 100 }),
      makeTask({ taskKey: 's3-t2', title: 'B #priority:low', status: 'done', startedAt: 0, updatedAt: 500 }),
      makeTask({ taskKey: 's3-t3', sessionId: 'sess-1' }),
    ];
    const result3 = aggregateSprintData(sprint3, tasks3, [], [], [], []);
    const critical = result3.priorityCorrelation.find((p) => p.priority === 'critical');
    expect(critical).toBeDefined();
    expect(critical!.avgCycleTimeMs).toBe(100);
    expect(result3.sessionMetrics.totalSessions).toBe(1);

    // Cross-sprint sanity: each result references the correct sprint
    expect(result1.sprintName).toBe('Sprint 1');
    expect(result2.sprintName).toBe('Sprint 2');
    expect(result3.sprintName).toBe('Sprint 3');
  });
});
