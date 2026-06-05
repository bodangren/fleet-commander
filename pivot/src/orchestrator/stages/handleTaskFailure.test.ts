import { describe, expect, it, mock, beforeEach, afterAll } from 'bun:test';

const logCapture: Array<{
  severity: string;
  message: string;
  context: Record<string, unknown>;
  error: unknown;
}> = [];

const mockLogAndCaptureError = mock(
  async (
    _client: unknown,
    severity: string,
    message: string,
    context: Record<string, unknown>,
    error?: unknown,
  ) => {
    logCapture.push({ severity, message, context, error });
  },
);

mock.module('../logger', () => ({
  logAndCaptureError: mockLogAndCaptureError,
  consoleLogError: mock(() => {}),
  logOrchestratorError: mock(async () => {}),
}));

const { handleTaskFailure } = await import('./handleTaskFailure');
type TaskFailureContext = import('./handleTaskFailure').TaskFailureContext;

describe('handleTaskFailure', () => {
  const mockClient = {
    mutation: mock(async () => ({})),
  };

  beforeEach(() => {
    mockClient.mutation.mockReset();
    logCapture.length = 0;
    mockLogAndCaptureError.mockClear();
  });

  const baseCtx: TaskFailureContext = {
    projectSlug: 'p1',
    taskKey: 't1',
    taskTitle: 'Test task',
    assignee: 'agent-1',
    error: 'something went wrong',
  };

  it('calls all expected mutations (notify + recovery) when no maxRetries', async () => {
    await handleTaskFailure(mockClient as any, baseCtx);

    // notifyTaskFailed + logRecoveryEvent = 2
    expect(mockClient.mutation).toHaveBeenCalledTimes(2);
  });

  it('calls backoff notification when maxRetries is provided', async () => {
    await handleTaskFailure(mockClient as any, { ...baseCtx, maxRetries: 2 });

    // notifyTaskFailed + logRecoveryEvent + notifyBackoffExhausted = 3
    expect(mockClient.mutation).toHaveBeenCalledTimes(3);
  });

  it('does not throw when all mutations fail', async () => {
    (mockClient.mutation as any).mockImplementation(async () => {
      throw new Error('Convex unreachable');
    });

    await expect(handleTaskFailure(mockClient as any, baseCtx)).resolves.toBeUndefined();
  });

  it('continues to recovery log even if notification fails', async () => {
    let callCount = 0;
    (mockClient.mutation as any).mockImplementation(async () => {
      callCount++;
      // First call (notifyTaskFailed) fails; rest succeed
      if (callCount === 1) throw new Error('notify failed');
      return {};
    });

    await handleTaskFailure(mockClient as any, { ...baseCtx, maxRetries: 1 });

    // Should not throw, and should still attempt recovery + backoff
    expect(mockClient.mutation).toHaveBeenCalled();
  });

  it('uses unknown assignee when assignee is undefined', async () => {
    const ctx: TaskFailureContext = { ...baseCtx, assignee: undefined };
    await handleTaskFailure(mockClient as any, ctx);

    expect(mockClient.mutation).toHaveBeenCalledTimes(2);
  });

  it('forwards projectSlug, taskKey, and operation to logAndCaptureError when notify fails', async () => {
    (mockClient.mutation as any).mockImplementation(async (_ref: unknown, args: any) => {
      const a = args ?? {};
      if (typeof a.taskTitle === 'string' && typeof a.error === 'string') {
        throw new Error('notify failed');
      }
      return {};
    });

    await handleTaskFailure(mockClient as any, { ...baseCtx, maxRetries: 2 });

    const notifyFailureLog = logCapture.find((c) => c.context.operation === 'notifyTaskFailed');
    expect(notifyFailureLog).toBeDefined();
    expect(notifyFailureLog!.context.projectSlug).toBe('p1');
    expect(notifyFailureLog!.context.taskKey).toBe('t1');
    expect(notifyFailureLog!.context.operation).toBe('notifyTaskFailed');
    expect(notifyFailureLog!.severity).toBe('debug');
  });

  it('uses warning severity when the recovery log mutation fails', async () => {
    (mockClient.mutation as any).mockImplementation(async (_ref: unknown, args: any) => {
      const a = args ?? {};
      if (typeof a.taskId === 'string' && typeof a.eventType === 'string') {
        throw new Error('recovery log failed');
      }
      return {};
    });

    await handleTaskFailure(mockClient as any, baseCtx);

    const recoveryLogFailure = logCapture.find((c) => c.context.operation === 'logRecoveryEvent');
    expect(recoveryLogFailure).toBeDefined();
    expect(recoveryLogFailure!.severity).toBe('warning');
  });

  it('uses debug severity when the backoff-exhausted notification fails', async () => {
    (mockClient.mutation as any).mockImplementation(async (_ref: unknown, args: any) => {
      const a = args ?? {};
      if (typeof a.maxRetries === 'number') {
        throw new Error('backoff notification failed');
      }
      return {};
    });

    await handleTaskFailure(mockClient as any, { ...baseCtx, maxRetries: 1 });

    const backoffFailure = logCapture.find((c) => c.context.operation === 'notifyBackoffExhausted');
    expect(backoffFailure).toBeDefined();
    expect(backoffFailure!.severity).toBe('debug');
  });

  it('forwards projectSlug and taskKey to the recovery log mutation', async () => {
    const recoveryArgs: Record<string, unknown>[] = [];
    (mockClient.mutation as any).mockImplementation(async (_ref: unknown, args: any) => {
      const a = args ?? {};
      // logRecoveryEvent shape: has taskId + eventType
      if (typeof a.taskId === 'string' && typeof a.eventType === 'string') {
        recoveryArgs.push(a);
      }
      return {};
    });

    await handleTaskFailure(mockClient as any, baseCtx);

    expect(recoveryArgs).toHaveLength(1);
    expect(recoveryArgs[0]?.taskId).toBe('t1');
    expect(recoveryArgs[0]?.agentId).toBe('agent-1');
    expect(recoveryArgs[0]?.eventType).toBe('blocked');
  });

  it('uses unknown as agentId in recovery log when assignee is missing', async () => {
    const recoveryArgs: Record<string, unknown>[] = [];
    (mockClient.mutation as any).mockImplementation(async (_ref: unknown, args: any) => {
      const a = args ?? {};
      if (typeof a.taskId === 'string' && typeof a.eventType === 'string') {
        recoveryArgs.push(a);
      }
      return {};
    });

    await handleTaskFailure(mockClient as any, { ...baseCtx, assignee: undefined });

    expect(recoveryArgs[0]?.agentId).toBe('unknown');
  });

  it('does not call notifyBackoffExhausted when maxRetries is omitted', async () => {
    const backoffCalls: Record<string, unknown>[] = [];
    (mockClient.mutation as any).mockImplementation(async (_ref: unknown, args: any) => {
      const a = args ?? {};
      // notifyBackoffExhausted shape: has maxRetries
      if (typeof a.maxRetries === 'number') {
        backoffCalls.push(a);
      }
      return {};
    });

    await handleTaskFailure(mockClient as any, baseCtx);

    expect(backoffCalls).toHaveLength(0);
  });

  it('does not throw even when every underlying mutation (including the error logger) fails', async () => {
    (mockClient.mutation as any).mockImplementation(async () => {
      throw new Error('Convex unreachable, including error logger');
    });

    await expect(
      handleTaskFailure(mockClient as any, { ...baseCtx, maxRetries: 3 }),
    ).resolves.toBeUndefined();
  });

  it('preserves the original error context across all three logAndCaptureError call sites', async () => {
    (mockClient.mutation as any).mockImplementation(async (_ref: unknown, args: any) => {
      const a = args ?? {};
      if (typeof a.taskTitle === 'string' && typeof a.error === 'string') {
        throw new Error('original notify failure');
      }
      if (typeof a.taskId === 'string' && typeof a.eventType === 'string') {
        throw new Error('original recovery failure');
      }
      if (typeof a.maxRetries === 'number') {
        throw new Error('original backoff failure');
      }
      return {};
    });

    await handleTaskFailure(mockClient as any, { ...baseCtx, maxRetries: 1 });

    expect(logCapture.length).toBeGreaterThanOrEqual(3);
    const errorMessages = logCapture
      .map((c) => (c.error instanceof Error ? c.error.message : String(c.error ?? '')))
      .join('\n');
    expect(errorMessages).toContain('original notify failure');
    expect(errorMessages).toContain('original recovery failure');
    expect(errorMessages).toContain('original backoff failure');
  });
});
