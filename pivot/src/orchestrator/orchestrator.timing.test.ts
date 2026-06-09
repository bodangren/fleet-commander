import { describe, expect, it, mock, beforeEach } from 'bun:test';

describe('orchestrator timing instrumentation', () => {
  const mockClient = {
    mutation: mock(async () => {}),
    query: mock(async () => {}),
  };

  beforeEach(() => {
    mockClient.mutation.mockReset();
    mockClient.query.mockReset();
    (mockClient.query as any).mockImplementation(async (_ref: any, args: any) => {
      if (args?.taskId) return null;
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
    (mockClient.mutation as any).mockImplementation(async () => ({}));
  });

  it('records all phase timing fields and passes them to upsertWorkRun', async () => {
    const { runProject } = await import('./orchestrator');
    const mockExecute = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'done',
      durationMs: 0,
    }));

    await runProject(
      mockClient as any,
      'test-project',
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      undefined,
      mockExecute,
    );

    const upsertCall = (mockClient.mutation.mock.calls as unknown as [unknown, Record<string, unknown>][])
      .filter((c) => typeof c[1].selectedTaskKey === 'string')
      .find((c) => typeof c[1].loadMs === 'number');

    expect(upsertCall).toBeDefined();
    const t = upsertCall![1];
    expect(t.loadMs).toBeGreaterThanOrEqual(0);
    expect(t.scoreMs).toBeGreaterThanOrEqual(0);
    expect(t.executeMs).toBeGreaterThanOrEqual(0);
    expect(t.persistMs).toBeGreaterThanOrEqual(0);
    expect(t.hookBeforeMs).toBeGreaterThanOrEqual(0);
    expect(t.hookAfterMs).toBeGreaterThanOrEqual(0);
    expect(t.totalMs).toBeGreaterThanOrEqual(0);
    expect(t.totalMs).toBeGreaterThanOrEqual(
      (t.loadMs as number) + (t.scoreMs as number) + (t.executeMs as number) + (t.persistMs as number),
    );
  });

  it('instrumentation overhead (unmeasured gap) is under 5ms', async () => {
    const { runProject } = await import('./orchestrator');
    const gaps: number[] = [];

    for (let i = 0; i < 7; i++) {
      mockClient.mutation.mockReset();
      mockClient.query.mockReset();
      (mockClient.query as any).mockImplementation(async (_ref: any, args: any) => {
        if (args?.taskId) return null;
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
      (mockClient.mutation as any).mockImplementation(async () => ({}));

      const mockExecute = mock(async () => ({
        taskKey: 't1',
        status: 'succeeded' as const,
        exitCode: 0,
        output: 'done',
        durationMs: 0,
      }));

      await runProject(
        mockClient as any,
        'test-project',
        { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
        undefined,
        mockExecute,
      );

      const upsertCall = (mockClient.mutation.mock.calls as unknown as [unknown, Record<string, unknown>][])
        .filter((c) => typeof c[1].selectedTaskKey === 'string')
        .find((c) => typeof c[1].loadMs === 'number');

      expect(upsertCall).toBeDefined();
      const t = upsertCall![1];
      const sumPhases =
        (t.loadMs as number) +
        (t.scoreMs as number) +
        (t.executeMs as number) +
        (t.persistMs as number) +
        (t.hookBeforeMs as number) +
        (t.hookAfterMs as number);
      const gap = (t.totalMs as number) - sumPhases;
      gaps.push(gap);
    }

    gaps.sort((a, b) => a - b);
    const median = gaps[Math.floor(gaps.length / 2)];
    expect(median).toBeLessThan(5);
  });
});
