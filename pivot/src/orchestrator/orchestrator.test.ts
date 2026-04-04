import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test';
import {
  scoreTask,
  isTaskBlockedByDependencies,
  getBestTask,
  parseIssues,
} from './index';
import type { Task, CandidateTask, IssueHooks } from './types';

// ── Evaluator Tests ──

describe('scoreTask', () => {
  it('returns -1 for non-todo/ready tasks', () => {
    const task: Task = {
      projectSlug: 'p',
      trackId: 't',
      taskKey: 't1',
      title: 'Do something',
      status: 'done',
      dependencies: [],
      updatedAt: 0,
    };
    expect(scoreTask(task)).toBe(-1);
  });

  it('returns 0 for blocked tasks', () => {
    const task: Task = {
      projectSlug: 'p',
      trackId: 't',
      taskKey: 't1',
      title: 'Blocked task',
      status: 'blocked',
      dependencies: [],
      updatedAt: 0,
    };
    expect(scoreTask(task)).toBe(0);
  });

  it('returns 1 for normal todo tasks', () => {
    const task: Task = {
      projectSlug: 'p',
      trackId: 't',
      taskKey: 't1',
      title: 'Normal task',
      status: 'todo',
      dependencies: [],
      updatedAt: 0,
    };
    expect(scoreTask(task)).toBe(1);
  });

  it('returns 2 for high-priority tasks', () => {
    const task: Task = {
      projectSlug: 'p',
      trackId: 't',
      taskKey: 't1',
      title: 'priority:high Fix critical bug',
      status: 'todo',
      dependencies: [],
      updatedAt: 0,
    };
    expect(scoreTask(task)).toBe(2);
  });

  it('returns 1 for ready status tasks', () => {
    const task: Task = {
      projectSlug: 'p',
      trackId: 't',
      taskKey: 't1',
      title: 'Ready task',
      status: 'ready',
      dependencies: [],
      updatedAt: 0,
    };
    expect(scoreTask(task)).toBe(1);
  });
});

describe('isTaskBlockedByDependencies', () => {
  it('returns false when no dependencies', () => {
    const task: Task = {
      projectSlug: 'p',
      trackId: 't',
      taskKey: 't1',
      title: 'No deps',
      status: 'todo',
      dependencies: [],
      updatedAt: 0,
    };
    expect(isTaskBlockedByDependencies(task, new Map())).toBe(false);
  });

  it('returns true when dependency not done', () => {
    const task: Task = {
      projectSlug: 'p',
      trackId: 't',
      taskKey: 't2',
      title: 'Depends on t1',
      status: 'todo',
      dependencies: ['t1'],
      updatedAt: 0,
    };
    const allTasks = new Map<string, Task>();
    allTasks.set('t1', {
      projectSlug: 'p',
      trackId: 't',
      taskKey: 't1',
      title: 'Prereq',
      status: 'todo',
      dependencies: [],
      updatedAt: 0,
    });
    expect(isTaskBlockedByDependencies(task, allTasks)).toBe(true);
  });

  it('returns false when all dependencies done', () => {
    const task: Task = {
      projectSlug: 'p',
      trackId: 't',
      taskKey: 't2',
      title: 'Depends on t1',
      status: 'todo',
      dependencies: ['t1'],
      updatedAt: 0,
    };
    const allTasks = new Map<string, Task>();
    allTasks.set('t1', {
      projectSlug: 'p',
      trackId: 't',
      taskKey: 't1',
      title: 'Prereq',
      status: 'done',
      dependencies: [],
      updatedAt: 0,
    });
    expect(isTaskBlockedByDependencies(task, allTasks)).toBe(false);
  });

  it('returns true when dependency is missing from map', () => {
    const task: Task = {
      projectSlug: 'p',
      trackId: 't',
      taskKey: 't2',
      title: 'Depends on t1',
      status: 'todo',
      dependencies: ['t1'],
      updatedAt: 0,
    };
    expect(isTaskBlockedByDependencies(task, new Map())).toBe(true);
  });
});

describe('getBestTask', () => {
  const trackStatuses = new Map<string, string>();
  trackStatuses.set('track-a', 'active');

  it('returns null when no tasks', () => {
    expect(getBestTask([], trackStatuses)).toBeNull();
  });

  it('returns the highest-scoring task', () => {
    const tasks: Task[] = [
      {
        projectSlug: 'p',
        trackId: 'track-a',
        taskKey: 'low',
        title: 'Low priority',
        status: 'todo',
        dependencies: [],
        updatedAt: 0,
      },
      {
        projectSlug: 'p',
        trackId: 'track-a',
        taskKey: 'high',
        title: 'priority:high Critical',
        status: 'todo',
        dependencies: [],
        updatedAt: 0,
      },
    ];
    const result = getBestTask(tasks, trackStatuses);
    expect(result).not.toBeNull();
    expect(result!.task.taskKey).toBe('high');
    expect(result!.score).toBe(2);
  });

  it('skips done and in_progress tasks', () => {
    const tasks: Task[] = [
      {
        projectSlug: 'p',
        trackId: 'track-a',
        taskKey: 'done1',
        title: 'Already done',
        status: 'done',
        dependencies: [],
        updatedAt: 0,
      },
      {
        projectSlug: 'p',
        trackId: 'track-a',
        taskKey: 'inprog',
        title: 'In progress',
        status: 'in_progress',
        dependencies: [],
        updatedAt: 0,
      },
    ];
    expect(getBestTask(tasks, trackStatuses)).toBeNull();
  });

  it('skips tasks with incomplete dependencies', () => {
    const tasks: Task[] = [
      {
        projectSlug: 'p',
        trackId: 'track-a',
        taskKey: 't1',
        title: 'First',
        status: 'todo',
        dependencies: [],
        updatedAt: 0,
      },
      {
        projectSlug: 'p',
        trackId: 'track-a',
        taskKey: 't2',
        title: 'Depends on t1',
        status: 'todo',
        dependencies: ['t1'],
        updatedAt: 0,
      },
    ];
    const result = getBestTask(tasks, trackStatuses);
    expect(result).not.toBeNull();
    expect(result!.task.taskKey).toBe('t1');
  });

  it('selects deterministically on equal scores', () => {
    const tasks: Task[] = [
      {
        projectSlug: 'p',
        trackId: 'track-a',
        taskKey: 'zzz',
        title: 'Last alphabetically',
        status: 'todo',
        dependencies: [],
        updatedAt: 0,
      },
      {
        projectSlug: 'p',
        trackId: 'track-a',
        taskKey: 'aaa',
        title: 'First alphabetically',
        status: 'todo',
        dependencies: [],
        updatedAt: 0,
      },
    ];
    const result = getBestTask(tasks, trackStatuses);
    expect(result).not.toBeNull();
    expect(result!.task.taskKey).toBe('aaa');
  });

  it('skips tasks in complete tracks', () => {
    const ts = new Map<string, string>();
    ts.set('track-done', 'complete');
    const tasks: Task[] = [
      {
        projectSlug: 'p',
        trackId: 'track-done',
        taskKey: 't1',
        title: 'In complete track',
        status: 'todo',
        dependencies: [],
        updatedAt: 0,
      },
    ];
    expect(getBestTask(tasks, ts)).toBeNull();
  });
});

// ── Issue Parser Tests ──

describe('parseIssues', () => {
  it('returns empty array for output without issue blocks', () => {
    expect(parseIssues('normal output')).toEqual([]);
  });

  it('parses a single issue block', () => {
    const output = `Some output\n\`\`\`issue\n{"title":"Missing API","description":"The endpoint is not implemented","severity":"high"}\n\`\`\`\nMore output`;
    const issues = parseIssues(output);
    expect(issues).toHaveLength(1);
    expect(issues[0].title).toBe('Missing API');
    expect(issues[0].description).toBe('The endpoint is not implemented');
    expect(issues[0].severity).toBe('high');
  });

  it('parses multiple issue blocks', () => {
    const output = `\`\`\`issue\n{"title":"Issue 1","description":"Desc 1"}\n\`\`\`\n\`\`\`issue\n{"title":"Issue 2","description":"Desc 2"}\n\`\`\``;
    const issues = parseIssues(output);
    expect(issues).toHaveLength(2);
    expect(issues[0].title).toBe('Issue 1');
    expect(issues[1].title).toBe('Issue 2');
  });

  it('skips blocks with missing title or description', () => {
    const output = `\`\`\`issue\n{"title":"No desc"}\n\`\`\`\n\`\`\`issue\n{"description":"No title"}\n\`\`\``;
    const issues = parseIssues(output);
    expect(issues).toHaveLength(0);
  });

  it('skips malformed JSON blocks', () => {
    const output = `\`\`\`issue\nnot json at all\n\`\`\``;
    const issues = parseIssues(output);
    expect(issues).toHaveLength(0);
  });

  it('skips empty blocks', () => {
    const output = `\`\`\`issue\n\n\`\`\``;
    const issues = parseIssues(output);
    expect(issues).toHaveLength(0);
  });
});

// ── Issue Hooks Wiring Tests (TD-003) ──

describe('runProject with issue hooks', () => {
  const mockClient = {
    mutation: mock(async () => {}),
    query: mock(async () => []),
  };

  beforeEach(() => {
    mockClient.mutation.mockReset();
    mockClient.query.mockReset();
    mockClient.query.mockImplementation(async (fn: string) => {
      if ((fn as string).includes('fleetCatalog:listTasksByProject')) {
        return [
          {
            projectSlug: 'test-project',
            trackId: 'track-a',
            taskKey: 't1',
            title: 'Test task',
            status: 'todo',
            dependencies: [],
            updatedAt: Date.now(),
          },
        ];
      }
      if ((fn as string).includes('fleetCatalog:listTracksByProject')) {
        return [{ projectSlug: 'test-project', trackId: 'track-a', status: 'active', version: 1, updatedAt: Date.now(), title: 'Track A' }];
      }
      return [];
    });
  });

  it('calls blocker hook on max retries exhausted', async () => {
    const { runProject } = await import('./orchestrator');
    const blockerHook = mock(async () => {});
    const delegationHook = mock(async () => 0);
    const hooks: IssueHooks = {
      createBlocker: blockerHook,
      createDelegations: delegationHook,
    };
    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'failed',
      exitCode: 1,
      output: '',
      error: 'test error',
      failureType: 'exit_code',
      durationMs: 100,
    }));

    await runProject(mockClient as any, 'test-project', { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 }, hooks, mockExecute);

    expect(blockerHook).toHaveBeenCalledTimes(1);
    expect(blockerHook).toHaveBeenCalledWith(
      'test-project',
      't1',
      'Test task',
      'test error',
      'exit_code',
      1,
      100,
      1,
    );
  });

  it('calls delegation hook on success', async () => {
    const { runProject } = await import('./orchestrator');
    const blockerHook = mock(async () => {});
    const delegationHook = mock(async () => 2);
    const hooks: IssueHooks = {
      createBlocker: blockerHook,
      createDelegations: delegationHook,
    };
    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded',
      exitCode: 0,
      output: 'success',
      durationMs: 200,
    }));

    await runProject(mockClient as any, 'test-project', undefined, hooks, mockExecute);

    expect(delegationHook).toHaveBeenCalledTimes(1);
    expect(delegationHook).toHaveBeenCalledWith(
      'test-project',
      't1',
      'success',
    );
  });

  it('skips hooks when not provided (no-op mode)', async () => {
    const { runProject } = await import('./orchestrator');
    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded',
      exitCode: 0,
      output: '',
      durationMs: 100,
    }));

    const result = await runProject(mockClient as any, 'test-project', undefined, undefined, mockExecute);

    expect(result.status).toBe('succeeded');
  });
});

// ── Dependency Evaluator State Preservation Tests (TD-004) ──

describe('getBestTask preserves blocked state', () => {
  const trackStatuses = new Map<string, string>();
  trackStatuses.set('track-a', 'active');

  it('does not auto-unblock tasks with manual blocking', () => {
    const tasks: Task[] = [
      {
        projectSlug: 'p',
        trackId: 'track-a',
        taskKey: 't1',
        title: 'Manual blocked task',
        status: 'blocked',
        dependencies: [],
        updatedAt: 0,
      },
    ];

    const result = getBestTask(tasks, trackStatuses);

    expect(result).toBeNull();
  });

  it('allows blocked task with satisfied deps to be scored', () => {
    const tasks: Task[] = [
      {
        projectSlug: 'p',
        trackId: 'track-a',
        taskKey: 'dep',
        title: 'Dependency',
        status: 'done',
        dependencies: [],
        updatedAt: 0,
      },
      {
        projectSlug: 'p',
        trackId: 'track-a',
        taskKey: 'blocked-task',
        title: 'Blocked task with satisfied deps',
        status: 'blocked',
        dependencies: ['dep'],
        updatedAt: 0,
      },
    ];

    const result = getBestTask(tasks, trackStatuses);

    expect(result).not.toBeNull();
    expect(result!.task.taskKey).toBe('blocked-task');
  });

  it('skips blocked tasks that still have incomplete dependencies', () => {
    const tasks: Task[] = [
      {
        projectSlug: 'p',
        trackId: 'track-a',
        taskKey: 'dep',
        title: 'Incomplete dependency',
        status: 'todo',
        dependencies: [],
        updatedAt: 0,
      },
      {
        projectSlug: 'p',
        trackId: 'track-a',
        taskKey: 'blocked-task',
        title: 'Still blocked',
        status: 'blocked',
        dependencies: ['dep'],
        updatedAt: 0,
      },
    ];

    const result = getBestTask(tasks, trackStatuses);

    // The dep task is still todo, so blocked-task stays blocked
    // Only the dep task should be eligible
    expect(result).not.toBeNull();
    expect(result!.task.taskKey).toBe('dep');
  });

  it('prefers non-blocked tasks over unblockable blocked tasks', () => {
    const tasks: Task[] = [
      {
        projectSlug: 'p',
        trackId: 'track-a',
        taskKey: 'normal',
        title: 'Normal todo task',
        status: 'todo',
        dependencies: [],
        updatedAt: 0,
      },
      {
        projectSlug: 'p',
        trackId: 'track-a',
        taskKey: 'manual-blocked',
        title: 'Manually blocked',
        status: 'blocked',
        dependencies: [],
        updatedAt: 0,
      },
    ];

    const result = getBestTask(tasks, trackStatuses);

    expect(result).not.toBeNull();
    expect(result!.task.taskKey).toBe('normal');
  });
});
