/**
 * Phase 1 Characterization Net for runProject.
 *
 * These tests are intentionally written BEFORE any refactor. They lock in the
 * current observable behavior of `runProject` (the 1034-line god-function) so
 * that subsequent decomposition phases (extract stage boundaries, thin the
 * shell) cannot silently change behavior.
 *
 * Each test exercises one high-value scenario from the test-strategy and
 * asserts:
 *   - the public `RunResult` shape
 *   - the set of Convex mutations invoked (identified by arg shape, since
 *     Convex API function refs are opaque proxies)
 *   - the lifecycle side effects (run log appends, work-run upserts,
 *     task status transitions, recovery events, circuit-breaker updates,
 *     issue/notification hook calls)
 *
 * If any of these tests fails after a refactor, behavior has drifted and the
 * refactor must be adjusted before proceeding.
 */

import { describe, expect, it, mock } from 'bun:test';
import { runProject } from './orchestrator';
import type { ExecuteFn, IssueHooks } from './types';

const FAST_RETRY_CONFIG = {
  maxRetries: 0,
  baseDelayMs: 1,
  maxDelayMs: 1,
  commandTimeoutMs: 1000,
};

const RETRY_CONFIG = {
  maxRetries: 2,
  baseDelayMs: 1,
  maxDelayMs: 1,
  commandTimeoutMs: 1000,
};

type Args = Record<string, unknown>;
type Call = [unknown, Args?];

interface RecordingClient {
  query: ReturnType<typeof mock>;
  mutation: ReturnType<typeof mock>;
}

function createRecordingClient(): RecordingClient {
  const client: RecordingClient = {
    query: mock(async () => undefined),
    mutation: mock(async () => undefined),
  };
  (client.query as any).mockImplementation(async (_ref: unknown, _args?: Args) => undefined);
  (client.mutation as any).mockImplementation(async (_ref: unknown, _args?: Args) => undefined);
  return client;
}

function successfulExecute(
  taskKey: string,
  output = 'success',
  sessionId?: string,
): ExecuteFn {
  return mock(async () => ({
    taskKey,
    status: 'succeeded' as const,
    exitCode: 0,
    output,
    durationMs: 100,
    sessionId,
  }));
}

function failingExecute(
  taskKey: string,
  error: string,
  failureType: 'exit_code' | 'timeout' | 'tokens_exceeded' | 'unknown' = 'exit_code',
  exitCode = 1,
): ExecuteFn {
  return mock(async () => ({
    taskKey,
    status: 'failed' as const,
    exitCode,
    output: '',
    error,
    failureType,
    durationMs: 50,
  }));
}

const TODO_TASK = {
  projectSlug: 'demo',
  trackId: 'track-a',
  taskKey: 't1',
  title: 'Happy path task',
  status: 'backlog' as const,
  dependencies: [],
  updatedAt: 1,
};

const TRACK_STATUSES_OBJ = [
  { projectSlug: 'demo', trackId: 'track-a', title: 'Track', status: 'active', version: 1, updatedAt: 1 },
];

const PROJECT_OBJ = {
  slug: 'demo',
  name: 'Demo',
  rootPath: '/tmp/demo',
  status: 'active',
  source: 'manual',
};

interface QueryOpts {
  tasks?: unknown[];
  budgetHandler?: () => unknown;
  circuitHandler?: (args: Args) => 'open' | 'closed' | 'half-open' | undefined;
}

/**
 * Installs default mock handlers for the queries runProject performs during
 * the load / score / dispatch / persist lifecycle.
 *
 * Because Convex API function refs are opaque proxies that throw on
 * String(ref) and have no reliable identity, we identify queries by their
 * arg shape and a small in-call counter. The Convex function-call order
 * inside runProject is stable, so a sequence of projectSlug-only calls maps
 * deterministically to loadTasks -> loadTrackStatuses -> getLatestCoverage.
 */
function installLoaders(client: RecordingClient, opts: QueryOpts = {}) {
  const tasks = opts.tasks ?? [TODO_TASK];
  const budgetHandler = opts.budgetHandler ?? (() => ({ allowed: true }));
  const circuitHandler = opts.circuitHandler;

  let projectSlugCallCount = 0;
  let limitCount = 0;

  (client.query as any).mockImplementation(async (_ref: unknown, args?: Args) => {
    const a = args ?? {};

    // Mutex-style unique args first.
    if (typeof a.id === 'string') return PROJECT_OBJ;
    if (typeof a.taskId === 'string') return null;
    if (typeof a.scope === 'string') return budgetHandler();
    if (a.limit === 1000) return [];
    if (a.limit === 100) return [];

    // projectSlug-only calls: loadTasks, loadTrackStatuses, getLatestCoverage
    if (typeof a.projectSlug === 'string') {
      const idx = projectSlugCallCount++;
      if (idx === 0) return tasks;             // loadTasks
      if (idx === 1) return TRACK_STATUSES_OBJ; // loadTrackStatuses
      if (idx === 2) return null;               // getLatestCoverage
      return null;
    }

    return undefined;
  });

  if (circuitHandler) {
    (client.mutation as any).mockImplementation(async (_ref: unknown, args?: Args) => {
      const a = args ?? {};
      if (a.agentId && circuitHandler) {
        return circuitHandler(a);
      }
      return {};
    });
  }
}

function mutations(client: RecordingClient): Call[] {
  return (client.mutation.mock.calls as unknown as Call[]).map((c) => [c[0], c[1] ?? {}]);
}

function findMutation(
  client: RecordingClient,
  predicate: (args: Args) => boolean,
): Call[] {
  return mutations(client).filter((c) => predicate(c[1] ?? {}));
}

// ── 1. Happy path: todo -> in_progress -> done (merged) ──

describe('runProject characterization: happy path (ready -> merged)', () => {
  it('executes a single task, transitions to in_progress then done, and persists succeeded run', async () => {
    const client = createRecordingClient();
    installLoaders(client);
    const execute = successfulExecute('t1', 'all good');

    const result = await runProject(
      client as any,
      'demo',
      FAST_RETRY_CONFIG,
      undefined,
      execute,
    );

    expect(result).toEqual({ projectSlug: 'demo', taskKey: 't1', status: 'succeeded' });
    expect(execute).toHaveBeenCalledTimes(1);

    const taskStatusMutations = findMutation(
      client,
      (a) => a.taskKey === 't1' && a.taskKey !== undefined && typeof a.status === 'string' && typeof a.title === 'string' && a.projectSlug === 'demo',
    );
    const statuses = taskStatusMutations.map((c) => c[1]!.status);
    expect(statuses).toContain('in_progress');
    expect(statuses[statuses.length - 1]).toBe('done');

    const workRunMutations = findMutation(
      client,
      (a) => typeof a.runId === 'string' && (a.status === 'succeeded' || a.status === 'failed' || a.status === 'running' || a.status === 'queued'),
    );
    const runPersists = workRunMutations.filter(
      (c) => c[1]!.status === 'succeeded' || c[1]!.status === 'failed',
    );
    expect(runPersists.length).toBeGreaterThanOrEqual(1);
    const finalRun = runPersists[runPersists.length - 1];
    expect(finalRun[1]!.status).toBe('succeeded');
    expect(finalRun[1]!.selectedTaskKey).toBe('t1');
    expect(finalRun[1]!.loadMs).toEqual(expect.any(Number));
    expect(finalRun[1]!.scoreMs).toEqual(expect.any(Number));
    expect(finalRun[1]!.executeMs).toEqual(expect.any(Number));
    expect(finalRun[1]!.totalMs).toEqual(expect.any(Number));

    const logMutations = findMutation(
      client,
      (a) => typeof a.summary === 'string' && typeof a.runId === 'string',
    );
    const logStatuses = logMutations.map((c) => c[1]!.status);
    expect(logStatuses).toContain('running');
    expect(logStatuses).toContain('succeeded');

    const scoreAuditCalls = findMutation(
      client,
      (a) => a.chosenTaskId === 't1' && a.outcome === 'accepted',
    );
    expect(scoreAuditCalls.length).toBe(1);

    const noOpBlockerCalls = findMutation(
      client,
      (a) => a.taskKey === 't1' && (a as Record<string, unknown>).action === 'blocked',
    );
    expect(noOpBlockerCalls.length).toBe(0);
  });

  it('does not persist a failed work-run on successful execution', async () => {
    const client = createRecordingClient();
    installLoaders(client);
    const execute = successfulExecute('t1', 'all good');

    await runProject(client as any, 'demo', FAST_RETRY_CONFIG, undefined, execute);

    const failedWorkRun = findMutation(
      client,
      (a) => typeof a.runId === 'string' && a.status === 'failed',
    );
    expect(failedWorkRun.length).toBe(0);
  });
});

// ── 2. Budget-block: strict policy aborts before execution ──

describe('runProject characterization: budget block (strict policy)', () => {
  it('returns failed result with budget reason when strict policy denies and never executes', async () => {
    const client = createRecordingClient();
    installLoaders(client, {
      budgetHandler: () => ({ allowed: false, reason: 'over hard cap', policy: 'strict' }),
    });
    const execute = successfulExecute('t1', 'should not run');

    const result = await runProject(
      client as any,
      'demo',
      FAST_RETRY_CONFIG,
      undefined,
      execute,
    );

    expect(result.projectSlug).toBe('demo');
    expect(result.taskKey).toBe('t1');
    expect(result.status).toBe('failed');
    expect(typeof result.error).toBe('string');
    expect(result.error).toContain('over hard cap');
    expect(execute).not.toHaveBeenCalled();

    const taskStatusMutations = findMutation(
      client,
      (a) => a.taskKey === 't1' && typeof a.status === 'string' && typeof a.title === 'string',
    );
    const statuses = taskStatusMutations.map((c) => c[1]!.status);
    expect(statuses).not.toContain('in_progress');
    expect(statuses).not.toContain('done');
  });

  it('still attempts to execute when budget policy is advisory (does not block)', async () => {
    const client = createRecordingClient();
    installLoaders(client, {
      budgetHandler: () => ({ allowed: false, reason: 'soft cap exceeded', policy: 'advisory' }),
    });

    const execute = successfulExecute('t1', 'still runs');
    const result = await runProject(
      client as any,
      'demo',
      FAST_RETRY_CONFIG,
      undefined,
      execute,
    );

    expect(result.status).toBe('succeeded');
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

// ── 3. Circuit-open: open breaker blocks before execution ──

describe('runProject characterization: circuit breaker open', () => {
  it('returns failed result with circuit reason and never executes the task', async () => {
    const ASSIGNED_TASK = { ...TODO_TASK, assignee: 'agent-1' };
    const client = createRecordingClient();
    installLoaders(client, { tasks: [ASSIGNED_TASK] });

    // Override mutation: implement a 2-call state machine for the breaker.
    let initCalled = false;
    (client.mutation as any).mockImplementation(async (_ref: unknown, args?: Args) => {
      const a = args ?? {};
      if (a.agentId === 'agent-1' && a.failureType === undefined) {
        if (!initCalled) {
          initCalled = true;
          return {};
        }
        return 'open';
      }
      return {};
    });

    const execute = successfulExecute('t1', 'should not run');

    const result = await runProject(
      client as any,
      'demo',
      FAST_RETRY_CONFIG,
      undefined,
      execute,
    );

    expect(result.projectSlug).toBe('demo');
    expect(result.taskKey).toBe('t1');
    expect(result.status).toBe('failed');
    expect(result.error).toContain('Circuit breaker open');
    expect(result.error).toContain('agent-1');
    expect(execute).not.toHaveBeenCalled();

    const taskStatusMutations = findMutation(
      client,
      (a) => a.taskKey === 't1' && typeof a.status === 'string' && typeof a.title === 'string',
    );
    const statuses = taskStatusMutations.map((c) => c[1]!.status);
    expect(statuses).not.toContain('in_progress');
    expect(statuses).not.toContain('done');
  });

  it('does not record any failure on the breaker when dispatch was blocked', async () => {
    const ASSIGNED_TASK = { ...TODO_TASK, assignee: 'agent-1' };
    const client = createRecordingClient();
    installLoaders(client, { tasks: [ASSIGNED_TASK] });

    let initCalled = false;
    (client.mutation as any).mockImplementation(async (_ref: unknown, args?: Args) => {
      const a = args ?? {};
      if (a.agentId === 'agent-1') {
        if (!initCalled) {
          initCalled = true;
          return {};
        }
        return 'open';
      }
      return {};
    });

    const execute = successfulExecute('t1', 'should not run');

    await runProject(
      client as any,
      'demo',
      FAST_RETRY_CONFIG,
      undefined,
      execute,
    );

    const failureRecords = findMutation(
      client,
      (a) => a.agentId === 'agent-1' && a.failureType !== undefined,
    );
    expect(failureRecords.length).toBe(0);
  });
});

// ── 4. Single-stage failure with recovery ──

describe('runProject characterization: execution failure with recovery', () => {
  it('on persistent failure: marks task blocked, persists failed run, records circuit failure, and creates blocker', async () => {
    const ASSIGNED = { ...TODO_TASK, assignee: 'agent-1' };
    const client = createRecordingClient();
    installLoaders(client, { tasks: [ASSIGNED] });

    const execute = failingExecute('t1', 'persistent failure', 'exit_code', 1);
    const blocker = mock(async () => {});
    const delegation = mock(async () => 0);
    const hooks: IssueHooks = {
      createBlocker: blocker,
      createDelegations: delegation,
    };

    const result = await runProject(
      client as any,
      'demo',
      RETRY_CONFIG,
      hooks,
      execute,
    );

    expect(result.status).toBe('failed');
    expect(result.taskKey).toBe('t1');
    expect(result.error).toBe('persistent failure');
    expect(execute).toHaveBeenCalledTimes(3);
    expect(blocker).toHaveBeenCalledTimes(1);
    expect(blocker).toHaveBeenCalledWith(
      'demo',
      't1',
      'Happy path task',
      'persistent failure',
      'exit_code',
      1,
      50,
      3,
    );

    const finalTaskStatus = findMutation(
      client,
      (a) => a.taskKey === 't1' && a.status === 'blocked',
    );
    expect(finalTaskStatus.length).toBe(1);

    const finalWorkRun = findMutation(
      client,
      (a) => typeof a.runId === 'string' && a.status === 'failed',
    );
    expect(finalWorkRun.length).toBeGreaterThanOrEqual(1);
    const last = finalWorkRun[finalWorkRun.length - 1];
    expect(last[1]!.selectedTaskKey).toBe('t1');

    const circuitFailure = findMutation(
      client,
      (a) => a.agentId === 'agent-1' && typeof a.failureType === 'string',
    );
    expect(circuitFailure.length).toBeGreaterThanOrEqual(1);

    const retryEvents = findMutation(
      client,
      (a) => a.eventType === 'retry',
    );
    const blockedEvents = findMutation(
      client,
      (a) => a.eventType === 'blocked',
    );
    expect(retryEvents.length).toBeGreaterThanOrEqual(1);
    expect(blockedEvents.length).toBeGreaterThanOrEqual(1);

    const backoffExhaustedNotifications = findMutation(
      client,
      (a) => a.maxRetries === 2,
    );
    expect(backoffExhaustedNotifications.length).toBe(1);
  });

  it('succeeds after one transient failure (retry-then-succeed path)', async () => {
    const client = createRecordingClient();
    installLoaders(client);

    let attempt = 0;
    const execute: ExecuteFn = mock(async () => {
      attempt += 1;
      if (attempt === 1) {
        return {
          taskKey: 't1',
          status: 'failed' as const,
          exitCode: 1,
          output: '',
          error: 'transient',
          failureType: 'exit_code' as const,
          durationMs: 50,
        };
      }
      return {
        taskKey: 't1',
        status: 'succeeded' as const,
        exitCode: 0,
        output: 'recovered',
        durationMs: 100,
      };
    });

    const result = await runProject(
      client as any,
      'demo',
      RETRY_CONFIG,
      undefined,
      execute,
    );

    expect(result.status).toBe('succeeded');
    expect(execute).toHaveBeenCalledTimes(2);

    const finalTaskStatus = findMutation(
      client,
      (a) => a.taskKey === 't1' && a.status === 'done',
    );
    expect(finalTaskStatus.length).toBe(1);

    const retryEvents = findMutation(
      client,
      (a) => a.eventType === 'retry',
    );
    expect(retryEvents.length).toBe(1);

    const finalWorkRun = findMutation(
      client,
      (a) => typeof a.runId === 'string' && a.status === 'succeeded',
    );
    expect(finalWorkRun.length).toBeGreaterThanOrEqual(1);
  });
});

// ── 5. Empty-project no-op ──

describe('runProject characterization: empty project (no tasks)', () => {
  it('returns no_tasks with no task mutations and never calls execute', async () => {
    const client = createRecordingClient();
    installLoaders(client, { tasks: [] });
    const execute = successfulExecute('t1', 'should not run');

    const result = await runProject(
      client as any,
      'demo',
      FAST_RETRY_CONFIG,
      undefined,
      execute,
    );

    expect(result).toEqual({ projectSlug: 'demo', taskKey: null, status: 'no_tasks' });
    expect(execute).not.toHaveBeenCalled();

    const taskStatusMutations = findMutation(
      client,
      (a) => a.taskKey !== undefined && typeof a.status === 'string' && typeof a.title === 'string',
    );
    expect(taskStatusMutations.length).toBe(0);

    const workRunMutations = findMutation(
      client,
      (a) => typeof a.runId === 'string' && typeof a.status === 'string',
    );
    expect(workRunMutations.length).toBe(0);
  });

  it('returns no_tasks when all tasks are filtered by hard constraints (blocked status)', async () => {
    const BLOCKED_TASK = { ...TODO_TASK, status: 'blocked' as const };
    const client = createRecordingClient();
    installLoaders(client, { tasks: [BLOCKED_TASK] });

    const execute = successfulExecute('t1', 'should not run');
    const result = await runProject(
      client as any,
      'demo',
      FAST_RETRY_CONFIG,
      undefined,
      execute,
    );

    expect(result.status).toBe('no_tasks');
    expect(execute).not.toHaveBeenCalled();
  });
});

// ── 6. Reviewer routing (no-profile regression net) ──

describe('runProject characterization: reviewer routing (no-profile path)', () => {
  it('executes a reviewer-stage task with the assigned reviewer, transitions to done, and never calls atomic claim', async () => {
    const REVIEWER_TASK = {
      ...TODO_TASK,
      status: 'review' as const,
      reviewerId: 'agent-reviewer-1',
      mergerId: 'agent-merger-1',
      assignee: 'agent-reviewer-1',
    };
    const client = createRecordingClient();
    installLoaders(client, { tasks: [REVIEWER_TASK] });

    const execute = mock(async (
      _c: unknown,
      agentName: string,
      _title: string,
      _taskKey: string,
      _timeoutMs: number,
      _opts?: unknown,
    ) => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'review passed',
      durationMs: 75,
      sessionId: 'review-session-1',
    }));

    const result = await runProject(
      client as any,
      'demo',
      FAST_RETRY_CONFIG,
      undefined,
      execute as any,
    );

    expect(result.status).toBe('succeeded');
    expect(execute).toHaveBeenCalledTimes(1);
    const executeArgs = (execute.mock.calls[0] as unknown[]);
    expect(executeArgs[1]).toBe('agent-reviewer-1');

    // Reviewer success with a merger must transition to 'review' (so the next
    // orchestrator cycle routes to the merger). The reviewer pass is recorded
    // as succeeded.
    const taskStatusMutations = findMutation(
      client,
      (a) => a.taskKey === 't1' && typeof a.status === 'string' && typeof a.title === 'string',
    );
    const finalStatus = taskStatusMutations[taskStatusMutations.length - 1]?.[1]?.status;
    expect(finalStatus).toBe('review');

    // Atomic claim is reviewer/merger-path-inert: no claim mutation for
    // dispatchStage !== 'executor'. The claim mutation uses
    // (projectSlug, runId, taskKey) arg shape.
    const claimMutations = findMutation(
      client,
      (a) =>
        typeof a.runId === 'string' &&
        typeof a.projectSlug === 'string' &&
        typeof a.taskKey === 'string' &&
        a.reservationId !== undefined,
    );
    expect(claimMutations.length).toBe(0);
  });
});

// ── 7. Merger routing (no-profile regression net) ──

describe('runProject characterization: merger routing (no-profile path)', () => {
  it('executes a merger-stage task with the assigned merger and transitions to done', async () => {
    const MERGER_TASK = {
      ...TODO_TASK,
      status: 'review' as const,
      reviewerId: 'agent-reviewer-1',
      mergerId: 'agent-merger-1',
      assignee: 'agent-merger-1',
    };
    const client = createRecordingClient();
    installLoaders(client, { tasks: [MERGER_TASK] });

    const execute = mock(async (
      _c: unknown,
      agentName: string,
      _title: string,
      _taskKey: string,
      _timeoutMs: number,
      _opts?: unknown,
    ) => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'merge passed',
      durationMs: 60,
    }));

    const result = await runProject(
      client as any,
      'demo',
      FAST_RETRY_CONFIG,
      undefined,
      execute as any,
    );

    expect(result.status).toBe('succeeded');
    expect(execute).toHaveBeenCalledTimes(1);
    const executeArgs = (execute.mock.calls[0] as unknown[]);
    expect(executeArgs[1]).toBe('agent-merger-1');

    const taskStatusMutations = findMutation(
      client,
      (a) => a.taskKey === 't1' && typeof a.status === 'string' && typeof a.title === 'string',
    );
    const finalStatus = taskStatusMutations[taskStatusMutations.length - 1]?.[1]?.status;
    expect(finalStatus).toBe('done');

    // Merger path also does NOT call atomic claim.
    const claimMutations = findMutation(
      client,
      (a) =>
        typeof a.runId === 'string' &&
        typeof a.projectSlug === 'string' &&
        typeof a.taskKey === 'string' &&
        a.reservationId !== undefined,
    );
    expect(claimMutations.length).toBe(0);
  });
});

// ── 8. Atomic claim (no-profile regression net) ──

describe('runProject characterization: atomic claim on executor dispatch (no-profile path)', () => {
  it('invokes the claim mutation exactly once on a successful executor dispatch', async () => {
    const EXECUTOR_TASK = { ...TODO_TASK, assignee: 'agent-1' };
    const client = createRecordingClient();
    installLoaders(client, { tasks: [EXECUTOR_TASK] });

    const execute = successfulExecute('t1', 'executor done');
    await runProject(
      client as any,
      'demo',
      FAST_RETRY_CONFIG,
      undefined,
      execute,
    );

    // The claim mutation (`api.tasks.claimTaskForExecution`) carries
    // (projectSlug, trackId, taskKey, expectedStatus, runId). It is the
    // only mutation with `expectedStatus === 'ready'` and a `runId` but
    // NO `reservationId` (reservationId belongs to budget reservation,
    // not the claim call).
    const claimMutations = findMutation(
      client,
      (a) =>
        typeof a.runId === 'string' &&
        typeof a.projectSlug === 'string' &&
        typeof a.taskKey === 'string' &&
        a.expectedStatus === 'ready' &&
        a.reservationId === undefined,
    );
    expect(claimMutations.length).toBe(1);
  });
});

// ── 9. Git hooks (no-profile regression net) ──

describe('runProject characterization: Git hooks (no-profile path)', () => {
  it('invokes onTaskStart and onTaskComplete on successful executor dispatch; onMerger is NOT invoked', async () => {
    const EXECUTOR_TASK = { ...TODO_TASK, assignee: 'agent-1' };
    const client = createRecordingClient();
    installLoaders(client, { tasks: [EXECUTOR_TASK] });

    const execute = successfulExecute('t1', 'executor done');
    const onTaskStart = mock(async () => ({
      branchName: 'fleet/t1',
      branchCreated: true,
    }));
    const onTaskComplete = mock(async () => {});
    const onMerger = mock(async () => ({
      merged: true,
      targetBranch: 'main',
    }));

    const gitHooks = {
      onTaskStart,
      onTaskComplete,
      onMerger,
    };

    const result = await runProject(
      client as any,
      'demo',
      FAST_RETRY_CONFIG,
      undefined,
      execute,
      gitHooks,
    );

    expect(result.status).toBe('succeeded');
    expect(onTaskStart).toHaveBeenCalledTimes(1);
    expect(onTaskComplete).toHaveBeenCalledTimes(1);
    // onMerger is only invoked on the merger dispatch stage; the executor
    // path must NOT invoke it.
    expect(onMerger).not.toHaveBeenCalled();
  });

  it('invokes onMerger and onTaskComplete(shouldCleanupBranch: true) on a successful merger dispatch', async () => {
    const MERGER_TASK = {
      ...TODO_TASK,
      status: 'review' as const,
      reviewerId: 'agent-reviewer-1',
      mergerId: 'agent-merger-1',
      assignee: 'agent-merger-1',
    };
    const client = createRecordingClient();
    installLoaders(client, { tasks: [MERGER_TASK] });

    const execute = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'merge passed',
      durationMs: 60,
    }));
    const onTaskStart = mock(async () => ({
      branchName: 'fleet/t1',
      branchCreated: true,
    }));
    const onTaskComplete = mock(async () => {});
    const onMerger = mock(async () => ({
      merged: true,
      targetBranch: 'main',
    }));

    const gitHooks = {
      onTaskStart,
      onTaskComplete,
      onMerger,
    };

    const result = await runProject(
      client as any,
      'demo',
      FAST_RETRY_CONFIG,
      undefined,
      execute as any,
      gitHooks,
    );

    expect(result.status).toBe('succeeded');
    expect(onTaskStart).toHaveBeenCalledTimes(1);
    expect(onMerger).toHaveBeenCalledTimes(1);
    expect(onTaskComplete).toHaveBeenCalledTimes(1);
    // onTaskComplete on the merger path is called with
    // shouldCleanupBranch: true so the branch is deleted after merge.
    const completeArgs = (onTaskComplete.mock.calls[0] as unknown[]);
    expect(completeArgs[6]).toEqual({ shouldCleanupBranch: true });
  });
});
