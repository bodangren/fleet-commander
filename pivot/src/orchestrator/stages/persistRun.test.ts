import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { persistRun } from './persistRun';
import { appendRunLog } from './appendRunLog';

const walAdapter = {
  append: mock((_entry: { type: 'mutation'; target: string; args: Record<string, unknown> }) => ({
    id: 'wal-1',
    commit: () => {},
  })),
  commit: mock((_id: string) => {}),
};

describe('persistRun stage', () => {
  const mockClient = {
    mutation: mock(async () => ({})),
  };

  beforeEach(() => {
    mockClient.mutation.mockReset();
    walAdapter.append.mockClear();
    walAdapter.commit.mockClear();
  });

  it('writes upsertWorkRun mutation with status and timings', async () => {
    await persistRun(
      mockClient as any,
      {
        projectSlug: 'p1',
        runId: 'r1',
        status: 'succeeded',
        selectedTaskKey: 't1',
        finishedAt: 1234,
        timings: { loadMs: 10, scoreMs: 20, executeMs: 30, persistMs: 5, totalMs: 65 },
      },
      walAdapter,
    );

    expect(mockClient.mutation).toHaveBeenCalledTimes(1);
    const args = (mockClient.mutation.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(args.projectSlug).toBe('p1');
    expect(args.runId).toBe('r1');
    expect(args.status).toBe('succeeded');
    expect(args.selectedTaskKey).toBe('t1');
    expect(args.finishedAt).toBe(1234);
    expect(args.loadMs).toBe(10);
    expect(args.totalMs).toBe(65);
  });

  it('commits wal entry on successful Convex write', async () => {
    await persistRun(
      mockClient as any,
      { projectSlug: 'p1', runId: 'r1', status: 'succeeded' },
      walAdapter,
    );
    expect(walAdapter.append).toHaveBeenCalledTimes(1);
    expect(walAdapter.commit).toHaveBeenCalledWith('wal-1');
  });

  it('does not throw when Convex mutation fails', async () => {
    (mockClient.mutation as any).mockImplementation(async () => {
      throw new Error('Convex unreachable');
    });
    await expect(
      persistRun(
        mockClient as any,
        { projectSlug: 'p1', runId: 'r1', status: 'failed' },
        walAdapter,
      ),
    ).resolves.toBeUndefined();
  });

  it('does not commit wal when mutation fails (entry remains for replay)', async () => {
    (mockClient.mutation as any).mockImplementation(async () => {
      throw new Error('Convex unreachable');
    });
    await persistRun(
      mockClient as any,
      { projectSlug: 'p1', runId: 'r1', status: 'failed' },
      walAdapter,
    );
    expect(walAdapter.commit).not.toHaveBeenCalled();
  });
});

describe('appendRunLog stage', () => {
  const mockClient = {
    mutation: mock(async () => ({})),
  };

  beforeEach(() => {
    mockClient.mutation.mockReset();
    walAdapter.append.mockClear();
    walAdapter.commit.mockClear();
  });

  it('writes appendLog mutation with required fields', async () => {
    await appendRunLog(
      mockClient as any,
      {
        projectSlug: 'p1',
        runId: 'r1',
        status: 'running',
        summary: 'starting',
      },
      walAdapter,
    );

    expect(mockClient.mutation).toHaveBeenCalledTimes(1);
    const args = (mockClient.mutation.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(args.projectSlug).toBe('p1');
    expect(args.runId).toBe('r1');
    expect(args.status).toBe('running');
    expect(args.summary).toBe('starting');
  });

  it('passes trackId when provided', async () => {
    await appendRunLog(
      mockClient as any,
      {
        projectSlug: 'p1',
        runId: 'r1',
        status: 'succeeded',
        summary: 'done',
        trackId: 'track-a',
      },
      walAdapter,
    );
    const args = (mockClient.mutation.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(args.trackId).toBe('track-a');
  });

  it('does not throw on Convex failure', async () => {
    (mockClient.mutation as any).mockImplementation(async () => {
      throw new Error('Convex unreachable');
    });
    await expect(
      appendRunLog(
        mockClient as any,
        { projectSlug: 'p1', runId: 'r1', status: 'failed', summary: 'oops' },
        walAdapter,
      ),
    ).resolves.toBeUndefined();
  });
});
