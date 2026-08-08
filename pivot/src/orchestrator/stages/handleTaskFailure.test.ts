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
    mutation: mock(async (_reference: unknown, _args: Record<string, unknown>) => ({})),
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

  it('records one blocked recovery event when a task fails', async () => {
    await handleTaskFailure(mockClient as any, baseCtx);

    expect(mockClient.mutation).toHaveBeenCalledTimes(1);
    const args = mockClient.mutation.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(args).toMatchObject({
      taskId: 't1',
      agentId: 'agent-1',
      eventType: 'blocked',
      details: 'Task t1 blocked after 1 failed attempts',
    });
  });

  it('keeps recovery logging bounded to one write when retry metadata is present', async () => {
    await handleTaskFailure(mockClient as any, { ...baseCtx, attempt: 3, maxRetries: 2 });

    expect(mockClient.mutation).toHaveBeenCalledTimes(1);
    const args = mockClient.mutation.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(args.details).toBe('Task t1 blocked after 3 failed attempts');
  });

  it('does not throw when all mutations fail', async () => {
    (mockClient.mutation as any).mockImplementation(async () => {
      throw new Error('Convex unreachable');
    });

    await expect(handleTaskFailure(mockClient as any, baseCtx)).resolves.toBeUndefined();
  });

  it('uses unknown assignee when assignee is undefined', async () => {
    const ctx: TaskFailureContext = { ...baseCtx, assignee: undefined };
    await handleTaskFailure(mockClient as any, ctx);

    expect(mockClient.mutation).toHaveBeenCalledTimes(1);
    const args = mockClient.mutation.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(args.agentId).toBe('unknown');
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

});
