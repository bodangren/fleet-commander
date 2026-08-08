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

  it('returns 1 for normal backlog tasks', () => {
    const task: Task = {
      projectSlug: 'p',
      trackId: 't',
      taskKey: 't1',
      title: 'Normal task',
      status: 'backlog',
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
      status: 'backlog',
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
      status: 'backlog',
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
      status: 'backlog',
      dependencies: ['t1'],
      updatedAt: 0,
    };
    const allTasks = new Map<string, Task>();
    allTasks.set('t1', {
      projectSlug: 'p',
      trackId: 't',
      taskKey: 't1',
      title: 'Prereq',
      status: 'backlog',
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
      status: 'backlog',
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
      status: 'backlog',
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
        status: 'backlog',
        dependencies: [],
        updatedAt: 0,
      },
      {
        projectSlug: 'p',
        trackId: 'track-a',
        taskKey: 'high',
        title: 'priority:high Critical',
        status: 'backlog',
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
        status: 'backlog',
        dependencies: [],
        updatedAt: 0,
      },
      {
        projectSlug: 'p',
        trackId: 'track-a',
        taskKey: 't2',
        title: 'Depends on t1',
        status: 'backlog',
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
        status: 'backlog',
        dependencies: [],
        updatedAt: 0,
      },
      {
        projectSlug: 'p',
        trackId: 'track-a',
        taskKey: 'aaa',
        title: 'First alphabetically',
        status: 'backlog',
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
        status: 'backlog',
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
    (mockClient.query as any).mockImplementation(async () => {
      return [
        {
          projectSlug: 'test-project',
          trackId: 'track-a',
          taskKey: 't1',
          title: 'Test task',
          status: 'backlog',
          dependencies: [],
          updatedAt: Date.now(),
        },
      ];
    });
  });

  it('calls blocker hook on max retries exhausted', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    const blockerHook = mock(async () => {});
    const delegationHook = mock(async () => 0);
    const hooks: IssueHooks = {
      createBlocker: blockerHook,
      createDelegations: delegationHook,
    };
    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'failed' as const,
      exitCode: 1,
      output: '',
      error: 'test error',
      failureType: 'exit_code' as const,
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
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    const blockerHook = mock(async () => {});
    const delegationHook = mock(async () => 2);
    const hooks: IssueHooks = {
      createBlocker: blockerHook,
      createDelegations: delegationHook,
    };
    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
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
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'success',
      durationMs: 200,
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
        status: 'backlog',
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
        status: 'backlog',
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

// ── Review Hooks Wiring Tests (TD-008) ──

describe('runProject with review hooks', () => {
  const mockClient = {
    mutation: mock(async () => {}),
    query: mock(async () => []),
  };

  beforeEach(() => {
    mockClient.mutation.mockReset();
    mockClient.query.mockReset();
    (mockClient.query as any).mockImplementation(async () => {
      return [
        {
          projectSlug: 'test-project',
          trackId: 'track-a',
          taskKey: 't1',
          title: 'Test task',
          status: 'backlog',
          dependencies: [],
          updatedAt: Date.now(),
        },
      ];
    });
  });

  it('calls review hook on task success', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    const blockerHook = mock(async () => {});
    const delegationHook = mock(async () => 0);
    const reviewHook = mock(async () => ({
      status: 'passed' as const,
      summary: 'Code looks good',
      depth: 'full',
    }));
    const hooks: import('./types').IssueHooks = {
      createBlocker: blockerHook,
      createDelegations: delegationHook,
      runReview: reviewHook,
    };
    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'success',
      durationMs: 200,
    }));

    await runProject(mockClient as any, 'test-project', undefined, hooks, mockExecute);

    expect(reviewHook).toHaveBeenCalledTimes(1);
    expect(reviewHook).toHaveBeenCalledWith(
      'test-project',
      't1',
      'Test task',
      'success',
    );
  });

  it('logs agent-reviewed status when review hook succeeds', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    const blockerHook = mock(async () => {});
    const delegationHook = mock(async () => 0);
    const reviewHook = mock(async () => ({
      status: 'passed' as const,
      summary: 'All good',
      depth: 'full',
      agentComments: [],
    }));
    const hooks: import('./types').IssueHooks = {
      createBlocker: blockerHook,
      createDelegations: delegationHook,
      runReview: reviewHook,
    };
    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'success',
      durationMs: 200,
    }));

    await runProject(mockClient as any, 'test-project', undefined, hooks, mockExecute);

    const appendLogCalls = (mockClient.mutation.mock.calls as unknown as [unknown, Record<string, unknown>][]).filter(
      ([fnRef, args]) => {
        let fnStr = '';
        try { fnStr = String(fnRef); } catch { fnStr = ''; }
        const isAppendLog = fnStr.includes('appendLog') || (args && typeof args.summary === 'string' && args.summary.includes('Review completed'));
        return isAppendLog;
      },
    );

    expect(appendLogCalls.length).toBeGreaterThan(0);
    const logArgs = appendLogCalls[0][1];
    expect(logArgs.rawOutput).toContain('agent-reviewed');
  });

  it('continues successfully when review hook is not provided', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    const blockerHook = mock(async () => {});
    const delegationHook = mock(async () => 0);
    const hooks: import('./types').IssueHooks = {
      createBlocker: blockerHook,
      createDelegations: delegationHook,
    };
    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'success',
      durationMs: 200,
    }));

    const result = await runProject(mockClient as any, 'test-project', undefined, hooks, mockExecute);

    expect(result.status).toBe('succeeded');
  });

  it('continues successfully when review hook fails', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    const blockerHook = mock(async () => {});
    const delegationHook = mock(async () => 0);
    const reviewHook = mock(async () => { throw new Error('Review service unavailable'); });
    const hooks: import('./types').IssueHooks = {
      createBlocker: blockerHook,
      createDelegations: delegationHook,
      runReview: reviewHook,
    };
    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'success',
      durationMs: 200,
    }));

    const result = await runProject(mockClient as any, 'test-project', undefined, hooks, mockExecute);

    expect(result.status).toBe('succeeded');
  });
});

// ── Run Contract Validation Tests (A1 Phase 3) ──

describe('runProject with run contract validation', () => {
  const mockClient = {
    mutation: mock(async () => {}),
    query: mock(async () => []),
  };

  beforeEach(() => {
    mockClient.mutation.mockReset();
    mockClient.query.mockReset();
    (mockClient.query as any).mockImplementation(async (ref: any, args: any) => {
      if (args?.taskId) {
        return null; // getRunContract returns null => create new contract
      }
      return [
        {
          projectSlug: 'test-project',
          trackId: 'track-a',
          taskKey: 't1',
          title: 'Test task',
          status: 'backlog',
          dependencies: [],
          updatedAt: Date.now(),
        },
      ];
    });
  });

  it('persists valid executor output as run contract', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: JSON.stringify({
        changedFiles: ['src/a.ts', 'measure/tracks/test-track/plan.md'],
        testsRun: ['a.test.ts'],
        unresolvedAssumptions: [],
        confidence: 0.9,
        branch: 'feat/a',
        commit: 'abc123',
        status: 'succeeded',
      }),
      durationMs: 200,
    }));

    const result = await runProject(mockClient as any, 'test-project', undefined, undefined, mockExecute);

    expect(result.status).toBe('succeeded');
    const mutationCalls = (mockClient.mutation as ReturnType<typeof mock>).mock.calls;
    const createCall = mutationCalls.find((c: any) => c[1]?.taskId === 't1' && c[1]?.objective);
    const appendCall = mutationCalls.find((c: any) => c[1]?.taskId === 't1' && c[1]?.changedFiles);
    expect(createCall).toBeDefined();
    expect(appendCall).toBeDefined();
    expect(appendCall![1]).toMatchObject({
      taskId: 't1',
      changedFiles: ['src/a.ts', 'measure/tracks/test-track/plan.md'],
      status: 'succeeded',
    });
  });

  it('logs human_review recovery when executor output is invalid', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: JSON.stringify({
        changedFiles: 'not-an-array',
        confidence: 0.5,
      }),
      durationMs: 200,
    }));

    const result = await runProject(mockClient as any, 'test-project', undefined, undefined, mockExecute);

    expect(result.status).toBe('succeeded');
    const mutationCalls = (mockClient.mutation as ReturnType<typeof mock>).mock.calls;
    const recoveryCall = mutationCalls.find((c: any) => c[1]?.taskId === 't1' && c[1]?.action === 'human_review');
    expect(recoveryCall).toBeDefined();
    expect(recoveryCall![1]).toMatchObject({
      taskId: 't1',
      action: 'human_review',
      reason: expect.stringContaining('Executor output validation failed'),
    });
  });

  it('ignores non-JSON output without failing', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'plain text success message',
      durationMs: 200,
    }));

    const result = await runProject(mockClient as any, 'test-project', undefined, undefined, mockExecute);

    expect(result.status).toBe('succeeded');
  });
});

// ── Dispatch Hard Constraints Tests (A3 Phase 3) ──

describe('runProject with dispatch hard constraints', () => {
  const mockClient = {
    mutation: mock(async () => {}),
    query: mock(async () => []),
  };

  beforeEach(() => {
    mockClient.mutation.mockReset();
    mockClient.query.mockReset();
  });

  it('returns no_tasks when all tasks fail hard constraints', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    (mockClient.query as any).mockImplementation(async (ref: any, _args: any) => {
      if (ref && typeof ref === 'function' && ref.name === 'getRunContract') {
        return null;
      }
      return [
        {
          projectSlug: 'test-project',
          trackId: 'track-a',
          taskKey: 't1',
          title: 'Blocked task',
          status: 'blocked',
          dependencies: [],
          updatedAt: Date.now(),
        },
      ];
    });

    const result = await runProject(mockClient as any, 'test-project');
    expect(result.status).toBe('no_tasks');
  });

  it('selects only eligible tasks and persists rejections', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    (mockClient.query as any).mockImplementation(async (ref: any, args: any) => {
      if (args?.taskId) {
        return null;
      }
      return [
        {
          projectSlug: 'test-project',
          trackId: 'track-a',
          taskKey: 't1',
          title: 'Ready task',
          status: 'backlog',
          dependencies: [],
          updatedAt: Date.now(),
        },
        {
          projectSlug: 'test-project',
          trackId: 'track-a',
          taskKey: 't2',
          title: 'Blocked by deps',
          status: 'backlog',
          dependencies: ['missing'],
          updatedAt: Date.now(),
        },
      ];
    });

    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'done',
      durationMs: 200,
    }));

    const result = await runProject(
      mockClient as any,
      'test-project',
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      undefined,
      mockExecute,
    );

    expect(result.status).toBe('succeeded');
    expect(result.taskKey).toBe('t1');

    // Verify rejections were persisted
    const mutationCalls = (mockClient.mutation as any).mock.calls as unknown as [any, any][];
    const appendRejectionCalls = mutationCalls.filter(
      ([, args]) => args && args.rejections && args.rejections.some((r: any) => r.taskKey === 't2'),
    );
    expect(appendRejectionCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('never selects a task with unsatisfied dependencies', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    (mockClient.query as any).mockImplementation(async (ref: any, args: any) => {
      if (args?.taskId) {
        return null;
      }
      return [
        {
          projectSlug: 'test-project',
          trackId: 'track-a',
          taskKey: 't1',
          title: 'Blocked task',
          status: 'backlog',
          dependencies: ['t2'],
          updatedAt: Date.now(),
        },
        {
          projectSlug: 'test-project',
          trackId: 'track-a',
          taskKey: 't2',
          title: 'Dependency task',
          status: 'backlog',
          dependencies: [],
          updatedAt: Date.now(),
        },
      ];
    });

    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't2',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'done',
      durationMs: 200,
    }));

    const result = await runProject(
      mockClient as any,
      'test-project',
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      undefined,
      mockExecute,
    );

    // t1 has unsatisfied dep (t2 is not done), so only t2 is eligible
    expect(result.status).toBe('succeeded');
    expect(result.taskKey).toBe('t2');
  });
});

// ── Circuit Breaker Integration Tests ──

describe('runProject with circuit breaker', () => {
  const mockClient = {
    mutation: mock(async () => {}),
    query: mock(async () => []),
  };

  beforeEach(() => {
    mockClient.mutation.mockReset();
    mockClient.query.mockReset();
    (mockClient.query as any).mockImplementation(async () => {
      return [
        {
          projectSlug: 'test-project',
          trackId: 'track-a',
          taskKey: 't1',
          title: 'Test task',
          status: 'backlog',
          dependencies: [],
          updatedAt: Date.now(),
          assignee: 'agent-1',
        },
      ];
    });
  });

  it('skips task when circuit breaker is open', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    let initCalled = false;
    (mockClient.mutation as any).mockImplementation(async (ref: any, args: any) => {
      // After initCircuitBreaker is called for agent-1, return 'open' for evaluateCircuitState
      if (args?.agentId === 'agent-1') {
        if (!initCalled) {
          initCalled = true;
          return {}; // initCircuitBreaker
        }
        return 'open'; // evaluateCircuitState
      }
      return {};
    });

    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'done',
      durationMs: 100,
    }));

    const result = await runProject(mockClient as any, 'test-project', { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 }, undefined, mockExecute);

    expect(result.status).toBe('failed');
    expect(result.error).toContain('Circuit breaker open');
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('proceeds when circuit breaker is closed', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    let mutationCallCount = 0;
    (mockClient.mutation as any).mockImplementation(async (ref: any, args: any) => {
      mutationCallCount++;
      // Return 'closed' for evaluateCircuitState
      if (mutationCallCount === 2) return 'closed';
      return {};
    });

    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'done',
      durationMs: 100,
    }));

    const result = await runProject(mockClient as any, 'test-project', { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 }, undefined, mockExecute);

    expect(result.status).toBe('succeeded');
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it('skips circuit breaker check when task has no assignee', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    (mockClient.query as any).mockImplementation(async () => {
      return [
        {
          projectSlug: 'test-project',
          trackId: 'track-a',
          taskKey: 't1',
          title: 'Unassigned task',
          status: 'backlog',
          dependencies: [],
          updatedAt: Date.now(),
          // No assignee field
        },
      ];
    });

    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'done',
      durationMs: 100,
    }));

    const result = await runProject(mockClient as any, 'test-project', { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 }, undefined, mockExecute);

    expect(result.status).toBe('succeeded');
    // No circuit breaker mutations should have been called
    const circuitCalls = (mockClient.mutation as any).mock.calls.filter(
      ([, args]: any) => args?.agentId === 'agent-1',
    );
    expect(circuitCalls.length).toBe(0);
  });
});

// ── Retry Loop Integration Tests ──

describe('runProject retry loop', () => {
  const mockClient = {
    mutation: mock(async () => {}),
    query: mock(async () => []),
  };

  beforeEach(() => {
    mockClient.mutation.mockReset();
    mockClient.query.mockReset();
    (mockClient.query as any).mockImplementation(async () => {
      return [
        {
          projectSlug: 'test-project',
          trackId: 'track-a',
          taskKey: 't1',
          title: 'Test task',
          status: 'backlog',
          dependencies: [],
          updatedAt: Date.now(),
        },
      ];
    });
  });

  it('retries failed execution up to maxRetries', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    let attempt = 0;
    const mockExecute: import('./types').ExecuteFn = mock(async () => {
      attempt++;
      if (attempt < 3) {
        return {
          taskKey: 't1',
          status: 'failed' as const,
          exitCode: 1,
          output: '',
          error: `fail attempt ${attempt}`,
          failureType: 'exit_code' as const,
          durationMs: 50,
        };
      }
      return {
        taskKey: 't1',
        status: 'succeeded' as const,
        exitCode: 0,
        output: 'success',
        durationMs: 100,
      };
    });

    const result = await runProject(
      mockClient as any,
      'test-project',
      { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      undefined,
      mockExecute,
    );

    expect(result.status).toBe('succeeded');
    expect(mockExecute).toHaveBeenCalledTimes(3);
  });

  it('fails after exhausting all retries', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'failed' as const,
      exitCode: 1,
      output: '',
      error: 'persistent failure',
      failureType: 'exit_code' as const,
      durationMs: 50,
    }));

    const result = await runProject(
      mockClient as any,
      'test-project',
      { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      undefined,
      mockExecute,
    );

    expect(result.status).toBe('failed');
    expect(result.error).toBe('persistent failure');
    // 1 initial + 2 retries = 3 calls
    expect(mockExecute).toHaveBeenCalledTimes(3);
  });

  it('logs recovery events on retry', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    let attempt = 0;
    const mockExecute: import('./types').ExecuteFn = mock(async () => {
      attempt++;
      if (attempt === 1) {
        return {
          taskKey: 't1',
          status: 'failed' as const,
          exitCode: 1,
          output: '',
          error: 'first fail',
          failureType: 'exit_code' as const,
          durationMs: 50,
        };
      }
      return {
        taskKey: 't1',
        status: 'succeeded' as const,
        exitCode: 0,
        output: 'success',
        durationMs: 100,
      };
    });

    await runProject(
      mockClient as any,
      'test-project',
      { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      undefined,
      mockExecute,
    );

    const mutationCalls = (mockClient.mutation as any).mock.calls;
    const recoveryCalls = mutationCalls.filter(
      ([, args]: any) => args?.eventType === 'retry',
    );
    expect(recoveryCalls.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Adaptive Scoring Fallback Tests ──

describe('runProject adaptive scoring fallback', () => {
  const mockClient = {
    mutation: mock(async () => {}),
    query: mock(async () => []),
  };

  beforeEach(() => {
    mockClient.mutation.mockReset();
    mockClient.query.mockReset();
    (mockClient.query as any).mockImplementation(async () => {
      return [
        {
          projectSlug: 'test-project',
          trackId: 'track-a',
          taskKey: 't1',
          title: 'priority:high Critical task',
          status: 'backlog',
          dependencies: [],
          updatedAt: Date.now(),
        },
      ];
    });
  });

  it('still succeeds when legacy evaluator picks a task', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');

    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'done',
      durationMs: 100,
    }));

    const result = await runProject(
      mockClient as any,
      'test-project',
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      undefined,
      mockExecute,
    );

    expect(result.status).toBe('succeeded');
    expect(result.taskKey).toBe('t1');
  });
});

// ── WAL Fallback Characterization Tests ──

describe('runProject WAL fallback', () => {
  it('documents that setTaskStartedAt failure propagates (not WAL-protected)', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');

    // This test documents current behavior: setTaskStartedAt at orchestrator.ts:567
    // is NOT wrapped in try-catch, so a Convex failure there crashes the run.
    // Other mutations (appendLog, persistWorkRun, updateTaskStatus) ARE WAL-protected.
    const failingMutation = mock(async () => {
      throw new Error('Convex unreachable');
    });
    const mockClient = {
      mutation: failingMutation,
      query: mock(async () => [
        {
          projectSlug: 'test-project',
          trackId: 'track-a',
          taskKey: 't1',
          title: 'Test task',
          status: 'backlog',
          dependencies: [],
          updatedAt: Date.now(),
        },
      ]),
    };

    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'success',
      durationMs: 50,
    }));

    // When all mutations fail, the first unwrapped mutation (setTaskStartedAt) throws
    await expect(
      runProject(
        mockClient as any,
        'test-project',
        { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
        undefined,
        mockExecute,
      ),
    ).rejects.toThrow();
  });
});

// ── Persist/Timing Characterization Tests ──

describe('runProject persist and timing', () => {
  it('persists work run with timing fields on success', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    const mutationCalls: unknown[][] = [];

    const mockClient = {
      mutation: mock(async (...args: unknown[]) => {
        mutationCalls.push(args);
      }),
      query: mock(async () => [
        {
          projectSlug: 'test-project',
          trackId: 'track-a',
          taskKey: 't1',
          title: 'Test task',
          status: 'backlog',
          dependencies: [],
          updatedAt: Date.now(),
        },
      ]),
    };

    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'done',
      durationMs: 100,
    }));

    const result = await runProject(
      mockClient as any,
      'test-project',
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      undefined,
      mockExecute,
    );

    expect(result.status).toBe('succeeded');
    // Verify multiple mutations were called (task status, circuit breaker, notifications, persist)
    expect(mutationCalls.length).toBeGreaterThan(3);
  });

  it('persists work run with failed status on max retries exhausted', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');
    const mutationCalls: unknown[][] = [];

    const mockClient = {
      mutation: mock(async (...args: unknown[]) => {
        mutationCalls.push(args);
      }),
      query: mock(async () => [
        {
          projectSlug: 'test-project',
          trackId: 'track-a',
          taskKey: 't1',
          title: 'Test task',
          status: 'backlog',
          dependencies: [],
          updatedAt: Date.now(),
        },
      ]),
    };

    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'failed' as const,
      exitCode: 1,
      output: '',
      error: 'test failure',
      failureType: 'exit_code' as const,
      durationMs: 50,
    }));

    const result = await runProject(
      mockClient as any,
      'test-project',
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      undefined,
      mockExecute,
    );

    expect(result.status).toBe('failed');
    // Verify multiple mutations were called (task status, circuit breaker, blocker, persist)
    expect(mutationCalls.length).toBeGreaterThan(3);
  });
});

describe('runProject atomic claim short-circuit', () => {
  it('short-circuits the run when claimTaskForExecution returns { claimed: false } (another runner already owns the task)', async () => {
    const { runProjectWithTestPreflight: runProject } = await import('./orchestrator.testHelper');

    const mockClient = {
      mutation: mock(async (ref: any, args: any) => {
        // The orchestrator calls claimTaskForExecution with a specific arg
        // shape (projectSlug + trackId + taskKey + expectedStatus + runId).
        // Detect by args shape for robustness against api ref serialization.
        const isClaim =
          args &&
          typeof args.expectedStatus === 'string' &&
          typeof args.runId === 'string' &&
          typeof args.taskKey === 'string' &&
          typeof args.trackId === 'string';
        if (isClaim) {
          return { claimed: false, currentStatus: 'in_progress', reason: 'already claimed' };
        }
        return undefined;
      }),
      query: mock(async () => [
        {
          projectSlug: 'test-project',
          trackId: 'track-a',
          taskKey: 't1',
          title: 'Race test task',
          status: 'ready',
          dependencies: [],
          updatedAt: Date.now(),
        },
      ]),
    };

    let executeCalls = 0;
    const mockExecute: import('./types').ExecuteFn = mock(async () => {
      executeCalls++;
      return {
        taskKey: 't1',
        status: 'succeeded' as const,
        exitCode: 0,
        output: '',
        durationMs: 1,
      };
    });

    const result = await runProject(
      mockClient as any,
      'test-project',
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      undefined,
      mockExecute,
    );

    expect(result.status).toBe('failed');
    expect(result.error).toContain('already claimed');
    expect(executeCalls).toBe(0);
  });
});
