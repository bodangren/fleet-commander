import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { PipelineRunLifecycle } from './pipelineRunLifecycle';

const walAdapter = {
  append: mock((_entry: { type: 'mutation'; target: string; args: Record<string, unknown> }) => ({
    id: 'wal-1',
    commit: () => {},
  })),
  commit: mock((_id: string) => {}),
};

describe('PipelineRunLifecycle', () => {
  const mockClient = {
    mutation: mock(async () => ({})),
  };

  beforeEach(() => {
    mockClient.mutation.mockReset();
    walAdapter.append.mockClear();
    walAdapter.commit.mockClear();
  });

  it('start() persists a running work run', async () => {
    const lifecycle = new PipelineRunLifecycle(mockClient as any, 'p1', 'run-1', walAdapter);

    await lifecycle.start('t1');

    expect(mockClient.mutation).toHaveBeenCalledTimes(1);
    const args = (mockClient.mutation.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(args.projectSlug).toBe('p1');
    expect(args.runId).toBe('run-1');
    expect(args.status).toBe('running');
    expect(args.selectedTaskKey).toBe('t1');
  });

  it('appendLog() writes a log entry with the given status and summary', async () => {
    const lifecycle = new PipelineRunLifecycle(mockClient as any, 'p1', 'run-1', walAdapter);

    await lifecycle.appendLog('running', 'Dispatching task t1');

    expect(mockClient.mutation).toHaveBeenCalledTimes(1);
    const args = (mockClient.mutation.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(args.projectSlug).toBe('p1');
    expect(args.runId).toBe('run-1');
    expect(args.status).toBe('running');
    expect(args.summary).toBe('Dispatching task t1');
  });

  it('appendLog() passes rawOutput and trackId when provided', async () => {
    const lifecycle = new PipelineRunLifecycle(mockClient as any, 'p1', 'run-1', walAdapter);

    await lifecycle.appendLog('succeeded', 'done', 'output text', 'track-a');

    const args = (mockClient.mutation.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(args.rawOutput).toBe('output text');
    expect(args.trackId).toBe('track-a');
  });

  it('finalize() persists a succeeded work run with timings', async () => {
    const lifecycle = new PipelineRunLifecycle(mockClient as any, 'p1', 'run-1', walAdapter);

    await lifecycle.finalize('succeeded', 't1', { loadMs: 10, totalMs: 100 });

    const args = (mockClient.mutation.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(args.status).toBe('succeeded');
    expect(args.selectedTaskKey).toBe('t1');
    expect(args.loadMs).toBe(10);
    expect(args.totalMs).toBe(100);
    expect(args.finishedAt).toEqual(expect.any(Number));
  });

  it('finalize() persists a failed work run', async () => {
    const lifecycle = new PipelineRunLifecycle(mockClient as any, 'p1', 'run-1', walAdapter);

    await lifecycle.finalize('failed', 't1', { executeMs: 50, totalMs: 80 });

    const args = (mockClient.mutation.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(args.status).toBe('failed');
    expect(args.selectedTaskKey).toBe('t1');
    expect(args.executeMs).toBe(50);
  });

  it('commits WAL entry on successful mutation', async () => {
    const lifecycle = new PipelineRunLifecycle(mockClient as any, 'p1', 'run-1', walAdapter);

    await lifecycle.start('t1');

    expect(walAdapter.commit).toHaveBeenCalledWith('wal-1');
  });

  it('does not throw when Convex mutation fails', async () => {
    (mockClient.mutation as any).mockImplementation(async () => {
      throw new Error('Convex unreachable');
    });
    const lifecycle = new PipelineRunLifecycle(mockClient as any, 'p1', 'run-1', walAdapter);

    await expect(lifecycle.start('t1')).resolves.toBeUndefined();
  });

  it('does not commit WAL when mutation fails', async () => {
    (mockClient.mutation as any).mockImplementation(async () => {
      throw new Error('Convex unreachable');
    });
    const lifecycle = new PipelineRunLifecycle(mockClient as any, 'p1', 'run-1', walAdapter);

    await lifecycle.start('t1');

    expect(walAdapter.commit).not.toHaveBeenCalled();
  });
});
