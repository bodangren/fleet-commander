import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { updateTaskStatus } from './updateTaskStatus';
import type { Task } from '../types';

const walAdapter = {
  append: mock((_entry: { type: 'mutation'; target: string; args: Record<string, unknown> }) => ({
    id: 'wal-1',
    commit: () => {},
  })),
  commit: mock((_id: string) => {}),
};

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    projectSlug: 'p1',
    trackId: 'track-a',
    taskKey: 't1',
    title: 'Test task',
    status: 'todo',
    dependencies: [],
    updatedAt: 0,
    ...overrides,
  };
}

describe('updateTaskStatus stage', () => {
  const mockClient = {
    mutation: mock(async () => ({})),
  };

  beforeEach(() => {
    mockClient.mutation.mockReset();
    walAdapter.append.mockClear();
    walAdapter.commit.mockClear();
  });

  it('calls upsertTask with mapped status', async () => {
    const task = makeTask();
    await updateTaskStatus(mockClient as any, task, 'in_progress', undefined, walAdapter);

    expect(mockClient.mutation).toHaveBeenCalledTimes(1);
    const args = (mockClient.mutation.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(args.taskKey).toBe('t1');
    expect(args.status).toBe('in_progress');
  });

  it('commits wal on success', async () => {
    await updateTaskStatus(mockClient as any, makeTask(), 'in_progress', undefined, walAdapter);
    expect(walAdapter.commit).toHaveBeenCalledWith('wal-1');
  });

  it('persists sessionId when provided', async () => {
    await updateTaskStatus(mockClient as any, makeTask(), 'in_progress', 'session-42', walAdapter);
    const args = (mockClient.mutation.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(args.sessionId).toBe('session-42');
  });

  it('falls back to task.sessionId when not provided', async () => {
    const task = makeTask({ sessionId: 'session-on-task' });
    await updateTaskStatus(mockClient as any, task, 'in_progress', undefined, walAdapter);
    const args = (mockClient.mutation.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(args.sessionId).toBe('session-on-task');
  });

  it('does not throw when Convex fails (wal remains for replay)', async () => {
    (mockClient.mutation as any).mockImplementation(async () => {
      throw new Error('Convex unreachable');
    });
    await expect(
      updateTaskStatus(mockClient as any, makeTask(), 'blocked', undefined, walAdapter),
    ).resolves.toBeUndefined();
    expect(walAdapter.commit).not.toHaveBeenCalled();
  });

  it('works without wal adapter', async () => {
    await updateTaskStatus(mockClient as any, makeTask(), 'done', undefined);
    expect(mockClient.mutation).toHaveBeenCalledTimes(1);
  });
});
