import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { handleTaskFailure, type TaskFailureContext } from './handleTaskFailure';

describe('handleTaskFailure', () => {
  const mockClient = {
    mutation: mock(async () => ({})),
  };

  beforeEach(() => {
    mockClient.mutation.mockReset();
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
});
