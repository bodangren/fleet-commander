import { describe, expect, it, mock, beforeEach } from 'bun:test';
import type { ConvexHttpClient } from 'convex/browser';
import { recomputePolicyStats } from './recompute';
import type { RunContractRecord } from './rollup';

function createMockClient() {
  return {
    query: mock(),
    mutation: mock(),
  } as unknown as ConvexHttpClient;
}

function makeRecord(overrides: Partial<RunContractRecord> = {}): RunContractRecord {
  return {
    taskId: 'task-123',
    projectSlug: 'test-project',
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('recomputePolicyStats', () => {
  let client: ConvexHttpClient;

  beforeEach(() => {
    client = createMockClient();
  });

  it('returns no-op when there are no dirty buckets', async () => {
    const now = Date.now();
    const records: RunContractRecord[] = [
      makeRecord({ createdAt: now - 2000 }),
      makeRecord({ createdAt: now - 1000 }),
    ];

    (client.query as ReturnType<typeof mock>).mockImplementation(async (_name: any, args: any) => {
      if (args && typeof args.since === 'number') {
        return records;
      }
      if (args && args.scope === 'policyStats' && args.key === 'lastRunAt') {
        return { valueJson: JSON.stringify(now) };
      }
      return null;
    });

    const result = await recomputePolicyStats(client, { now });

    expect(result.recomputed).toBe(false);
    expect(result.reason).toBe('no_dirty_buckets');
    const mutationCalls = (client.mutation as ReturnType<typeof mock>).mock.calls;
    expect(mutationCalls.length).toBe(0);
  });

  it('recomputes and upserts stats when dirty buckets exist', async () => {
    const now = Date.now();
    const records: RunContractRecord[] = [
      makeRecord({
        taskId: 'task-feature-1',
        projectSlug: 'mono-repo',
        executorStatus: 'succeeded',
        executorConfidence: 0.9,
        architectConfidence: 0.8,
        createdAt: now + 1000,
      }),
      makeRecord({
        taskId: 'task-feature-2',
        projectSlug: 'mono-repo',
        executorStatus: 'succeeded',
        executorConfidence: 0.7,
        architectConfidence: 0.6,
        createdAt: now + 2000,
      }),
    ];

    (client.query as ReturnType<typeof mock>).mockImplementation(async (_name: any, args: any) => {
      if (args && typeof args.since === 'number') {
        return records;
      }
      if (args && args.scope === 'policyStats' && args.key === 'lastRunAt') {
        return { valueJson: JSON.stringify(now) };
      }
      return null;
    });

    const result = await recomputePolicyStats(client, { now, insufficientDataThreshold: 2 });

    expect(result.recomputed).toBe(true);
    expect(result.dispatchBuckets).toBe(1);
    expect(result.harnessNames).toBe(1);

    const mutationCalls = (client.mutation as ReturnType<typeof mock>).mock.calls;
    expect(mutationCalls.length).toBeGreaterThanOrEqual(3);

    const setSettingCall = mutationCalls.find((c) => c[1].scope === 'policyStats' && c[1].key === 'lastRunAt');
    expect(setSettingCall).toBeDefined();
    expect(JSON.parse(setSettingCall![1].valueJson)).toBe(now);
  });

  it('defaults lastRunAt to 0 when setting is missing', async () => {
    const now = Date.now();
    const records: RunContractRecord[] = [
      makeRecord({
        taskId: 'task-feature-1',
        projectSlug: 'mono-repo',
        executorStatus: 'succeeded',
        createdAt: now - 1000,
      }),
    ];

    (client.query as ReturnType<typeof mock>).mockImplementation(async (_name: any, args: any) => {
      if (args && typeof args.since === 'number') {
        return records;
      }
      if (args && args.scope === 'policyStats' && args.key === 'lastRunAt') {
        return null;
      }
      return null;
    });

    const result = await recomputePolicyStats(client, { now, insufficientDataThreshold: 1 });

    expect(result.recomputed).toBe(true);
  });

  it('perf: handles 10k contracts in under 2 seconds', async () => {
    const now = Date.now();
    const records: RunContractRecord[] = [];
    for (let i = 0; i < 10000; i++) {
      records.push(
        makeRecord({
          taskId: `task-feature-${i}`,
          projectSlug: 'mono-repo',
          executorStatus: 'succeeded',
          executorConfidence: 0.8,
          architectConfidence: 0.7,
          createdAt: now + i,
        }),
      );
    }

    (client.query as ReturnType<typeof mock>).mockImplementation(async (_name: any, args: any) => {
      if (args && typeof args.since === 'number') {
        return records;
      }
      if (args && args.scope === 'policyStats' && args.key === 'lastRunAt') {
        return { valueJson: JSON.stringify(now) };
      }
      return null;
    });

    const start = performance.now();
    const result = await recomputePolicyStats(client, { now, insufficientDataThreshold: 1 });
    const elapsed = performance.now() - start;

    expect(result.recomputed).toBe(true);
    expect(elapsed).toBeLessThan(2000);
  });
});
