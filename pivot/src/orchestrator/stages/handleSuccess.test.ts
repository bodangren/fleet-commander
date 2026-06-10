import { describe, expect, it, mock } from 'bun:test';
import { handleSuccess } from './handleSuccess';
import type { Task, ExecutionResult } from '../types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    projectSlug: 'demo',
    trackId: 'demo_track',
    taskKey: 'T-100',
    title: 'Implement the feature',
    status: 'in_progress',
    assignee: 'alice',
    dependencies: [],
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeLifecycle() {
  return {
    appendLog: async () => undefined,
    start: async () => undefined,
    finalize: async () => undefined,
  } as any;
}

function makeClient(opts: {
  recordCost?: (args: any) => Promise<{ costRecordId: string; costUSD: number; sessionCostSaved: number } | undefined>;
  capture?: (name: string, args: any) => void;
}) {
  const mutation = async (ref: any, args: any) => {
    const fnName = ref?._functionPath?.functionName ?? '';
    if (opts.capture) opts.capture(fnName, args);
    if (fnName === 'recordCost' && opts.recordCost) {
      return await opts.recordCost(args);
    }
    return undefined;
  };
  // The api.* refs have a _functionPath; emulate by checking fn name via stringification.
  // The real api uses an opaque ref — we route by checking the function name in the
  // mutation call as observed by the orchestrator stage. We monkey-patch the client
  // to short-circuit known calls.
  return {
    mutation: async (ref: any, args: any) => {
      // Convex `api.foo.bar` refs have a `_name` or `_functionPath` shape.
      // For testing, we accept that handleSuccess uses `api.costs.recordCost`,
      // which we route by name detection on the ref's `_componentPath` if any,
      // or via a fallback check on the args shape.
      const refStr = JSON.stringify(ref?._functionPath ?? ref?._name ?? ref ?? {});
      const isRecordCost = refStr.includes('recordCost') || (args && 'inputTokens' in args && 'outputTokens' in args && 'model' in args);
      if (opts.capture) opts.capture(isRecordCost ? 'recordCost' : 'other', args);
      if (isRecordCost && opts.recordCost) {
        return await opts.recordCost(args);
      }
      return undefined;
    },
    query: async () => null,
  } as any;
}

describe('handleSuccess.recordCost integration', () => {
  it('calls api.costs.recordCost once with model, tokens, agent, and projectSlug on success with input/output tokens', async () => {
    const calls: Array<{ name: string; args: any }> = [];
    const client = makeClient({
      recordCost: async () => ({ costRecordId: 'cr-1', costUSD: 0.42, sessionCostSaved: 0 }),
      capture: (name, args) => calls.push({ name, args }),
    });
    const task = makeTask({ assignee: 'alice', taskKey: 'T-200' });
    const lastResult: ExecutionResult = {
      taskKey: 'T-200',
      status: 'succeeded',
      durationMs: 100,
      output: '',
      inputTokens: 500,
      outputTokens: 200,
      model: 'gpt-4o',
    };

    const { costUSD } = await handleSuccess(
      client,
      'demo',
      'run-1',
      task,
      lastResult,
      Date.now(),
      undefined,
      {} as any,
      undefined,
      undefined,
      undefined,
      undefined,
      makeLifecycle(),
      undefined,
      'executor',
      'alice',
    );

    const recordCalls = calls.filter((c) => c.name === 'recordCost');
    expect(recordCalls.length).toBe(1);
    expect(recordCalls[0].args.model).toBe('gpt-4o');
    expect(recordCalls[0].args.inputTokens).toBe(500);
    expect(recordCalls[0].args.outputTokens).toBe(200);
    expect(recordCalls[0].args.agentId).toBe('alice');
    expect(recordCalls[0].args.projectSlug).toBe('demo');
    expect(costUSD).toBe(0.42);
  });

  it('skips recordCost when inputTokens and outputTokens are both 0', async () => {
    const calls: Array<{ name: string; args: any }> = [];
    const client = makeClient({
      recordCost: async () => ({ costRecordId: 'cr-2', costUSD: 0.0, sessionCostSaved: 0 }),
      capture: (name, args) => calls.push({ name, args }),
    });
    const task = makeTask();
    const lastResult: ExecutionResult = {
      taskKey: 'T-300',
      status: 'succeeded',
      durationMs: 10,
      output: '',
      inputTokens: 0,
      outputTokens: 0,
      model: 'gpt-4o',
    };

    const { costUSD } = await handleSuccess(
      client,
      'demo',
      'run-2',
      task,
      lastResult,
      Date.now(),
      undefined,
      {} as any,
      undefined,
      undefined,
      undefined,
      undefined,
      makeLifecycle(),
    );

    const recordCalls = calls.filter((c) => c.name === 'recordCost');
    expect(recordCalls.length).toBe(0);
    expect(costUSD).toBe(0);
  });

  it('returns costUSD=0 when recordCost throws (debug-logged, non-blocking)', async () => {
    const client = makeClient({
      recordCost: async () => {
        throw new Error('convex unreachable');
      },
    });
    const task = makeTask();
    const lastResult: ExecutionResult = {
      taskKey: 'T-400',
      status: 'succeeded',
      durationMs: 10,
      output: '',
      inputTokens: 100,
      outputTokens: 50,
      model: 'gpt-4o',
    };

    const { costUSD } = await handleSuccess(
      client,
      'demo',
      'run-3',
      task,
      lastResult,
      Date.now(),
      undefined,
      {} as any,
      undefined,
      undefined,
      undefined,
      undefined,
      makeLifecycle(),
    );

    expect(costUSD).toBe(0);
  });
});

describe('handleSuccess.mergerStage', () => {
  it('calls onMerger and then onTaskComplete with shouldCleanupBranch: true on merger success', async () => {
    const calls: Array<{ name: string; args: any }> = [];
    const client = makeClient({});
    const task = makeTask({ taskKey: 'T-500', title: 'Merge feature X' });
    const lastResult: ExecutionResult = {
      taskKey: 'T-500',
      status: 'succeeded',
      durationMs: 10,
      output: '',
      inputTokens: 0,
      outputTokens: 0,
      model: 'gpt-4o',
    };

    const gitHooks = {
      onMerger: mock(async (_p: any, _r: any, _id: any, _title: any, branchName: any) => {
        calls.push({ name: 'onMerger', args: { branchName } });
        return { merged: true, targetBranch: 'main' };
      }),
      onTaskComplete: mock(async (_p: any, _r: any, taskId: any, _t: any, success: any, _tr: any, options: any) => {
        calls.push({ name: 'onTaskComplete', args: { taskId, success, options } });
      }),
    };

    await handleSuccess(
      client,
      'demo',
      'run-merger',
      task,
      lastResult,
      Date.now(),
      '/tmp/repo',
      {} as any,
      undefined,
      gitHooks as any,
      undefined,
      undefined,
      makeLifecycle(),
      undefined,
      'merger',
    );

    expect(calls[0]?.name).toBe('onMerger');
    expect(calls[0]?.args.branchName).toContain('T-500');
    expect(calls[1]?.name).toBe('onTaskComplete');
    expect(calls[1]?.args.options?.shouldCleanupBranch).toBe(true);
  });

  it('passes shouldCleanupBranch: false from the executor stage so the branch survives downstream pipeline stages', async () => {
    const calls: Array<{ name: string; args: any }> = [];
    const client = makeClient({});
    const task = makeTask({ taskKey: 'T-501', title: 'Executor task' });
    const lastResult: ExecutionResult = {
      taskKey: 'T-501',
      status: 'succeeded',
      durationMs: 10,
      output: '',
      inputTokens: 0,
      outputTokens: 0,
      model: 'gpt-4o',
    };

    const gitHooks = {
      onTaskComplete: mock(async (_p: any, _r: any, taskId: any, _t: any, success: any, _tr: any, options: any) => {
        calls.push({ name: 'onTaskComplete', args: { taskId, success, options } });
      }),
    };

    await handleSuccess(
      client,
      'demo',
      'run-executor',
      task,
      lastResult,
      Date.now(),
      '/tmp/repo',
      {} as any,
      undefined,
      gitHooks as any,
      undefined,
      undefined,
      makeLifecycle(),
      undefined,
      'executor',
    );

    const completeCall = calls.find((c) => c.name === 'onTaskComplete');
    expect(completeCall).toBeDefined();
    expect(completeCall!.args.options?.shouldCleanupBranch).toBe(false);
  });

  it('skips onTaskComplete cleanup when merger reports merged: false', async () => {
    const calls: Array<{ name: string; args: any }> = [];
    const client = makeClient({});
    const task = makeTask({ taskKey: 'T-502', title: 'Conflict merge' });
    const lastResult: ExecutionResult = {
      taskKey: 'T-502',
      status: 'succeeded',
      durationMs: 10,
      output: '',
      inputTokens: 0,
      outputTokens: 0,
      model: 'gpt-4o',
    };

    const gitHooks = {
      onMerger: mock(async () => ({
        merged: false,
        targetBranch: 'main',
        conflict: true,
        error: 'CONFLICT (content)',
      })),
      onTaskComplete: mock(async (_p: any, _r: any, taskId: any) => {
        calls.push({ name: 'onTaskComplete', args: { taskId } });
      }),
    };

    await handleSuccess(
      client,
      'demo',
      'run-merger-conflict',
      task,
      lastResult,
      Date.now(),
      '/tmp/repo',
      {} as any,
      undefined,
      gitHooks as any,
      undefined,
      undefined,
      makeLifecycle(),
      undefined,
      'merger',
    );

    expect(calls.find((c) => c.name === 'onTaskComplete')).toBeUndefined();
  });
});

describe('handleSuccess.reviewerStage', () => {
  function makeStatusCapturingClient(statusUpdates: string[]) {
    return {
      mutation: async (_ref: any, args: any) => {
        if (args && typeof args.status === 'string') {
          statusUpdates.push(args.status);
        }
        return undefined;
      },
      query: async () => null,
    } as any;
  }

  const zeroTokenResult: ExecutionResult = {
    taskKey: 'T-600',
    status: 'succeeded',
    durationMs: 10,
    output: '',
    inputTokens: 0,
    outputTokens: 0,
    model: 'gpt-4o',
  };

  it('transitions a reviewed task with no merger to "done"', async () => {
    const statusUpdates: string[] = [];
    const client = makeStatusCapturingClient(statusUpdates);
    // reviewerId set, no mergerId — reviewer success must mark the task done.
    const task = makeTask({ taskKey: 'T-600', reviewerId: 'rev-1' });

    await handleSuccess(
      client,
      'demo',
      'run-reviewer-no-merger',
      task,
      zeroTokenResult,
      Date.now(),
      undefined,
      {} as any,
      undefined,
      undefined,
      undefined,
      undefined,
      makeLifecycle(),
      undefined,
      'reviewer',
    );

    expect(statusUpdates).toContain('done');
    expect(statusUpdates).not.toContain('review');
  });

  it('routes a reviewed task with a merger to "review" (awaiting merger), not "done"', async () => {
    const statusUpdates: string[] = [];
    const client = makeStatusCapturingClient(statusUpdates);
    const task = makeTask({ taskKey: 'T-601', reviewerId: 'rev-1', mergerId: 'mrg-1' });

    await handleSuccess(
      client,
      'demo',
      'run-reviewer-with-merger',
      task,
      { ...zeroTokenResult, taskKey: 'T-601' },
      Date.now(),
      undefined,
      {} as any,
      undefined,
      undefined,
      undefined,
      undefined,
      makeLifecycle(),
      undefined,
      'reviewer',
    );

    expect(statusUpdates).toContain('review');
    expect(statusUpdates).not.toContain('done');
  });
});
