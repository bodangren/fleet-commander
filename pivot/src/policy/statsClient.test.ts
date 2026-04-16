import { describe, expect, it, mock, beforeEach } from 'bun:test';
import type { ConvexHttpClient } from 'convex/browser';
import {
  upsertDispatchPolicyStats,
  getDispatchPolicyStats,
  listDispatchPolicyStats,
  upsertHarnessReliabilityStats,
  getHarnessReliabilityStats,
  listHarnessReliabilityStats,
} from './statsClient';

function createMockClient() {
  return {
    query: mock(),
    mutation: mock(),
  } as unknown as ConvexHttpClient;
}

describe('dispatchPolicyStats client', () => {
  let client: ConvexHttpClient;

  beforeEach(() => {
    client = createMockClient();
  });

  it('upserts dispatch policy stats', async () => {
    (client.mutation as ReturnType<typeof mock>).mockResolvedValue({
      _id: 'test-id',
      persona: 'executor',
      taskKind: 'feature',
      repoType: 'monorepo',
      sampleCount: 10,
    });

    const result = await upsertDispatchPolicyStats(client, {
      persona: 'executor',
      taskKind: 'feature',
      repoType: 'monorepo',
      meanDurationMs: 1200,
      p50Cost: 0.5,
      p90Cost: 1.2,
      reviewFailRate: 0.1,
      retryRate: 0.05,
      blockerCreationRate: 0,
      coverageRegressionRate: 0,
      sampleCount: 10,
      windowDays: 7,
      insufficientData: false,
      lastUpdatedAt: 1713240000000,
    });

    expect(result.persona).toBe('executor');
    expect(result.sampleCount).toBe(10);
    const calls = (client.mutation as ReturnType<typeof mock>).mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toMatchObject({
      persona: 'executor',
      taskKind: 'feature',
      repoType: 'monorepo',
      sampleCount: 10,
    });
  });

  it('gets dispatch policy stats by key', async () => {
    (client.query as ReturnType<typeof mock>).mockResolvedValue({
      _id: 'test-id',
      persona: 'executor',
      taskKind: 'feature',
      repoType: 'monorepo',
      sampleCount: 10,
    });

    const result = await getDispatchPolicyStats(client, 'executor', 'feature', 'monorepo');

    expect(result).not.toBeNull();
    expect(result!.sampleCount).toBe(10);
    const calls = (client.query as ReturnType<typeof mock>).mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toEqual({
      persona: 'executor',
      taskKind: 'feature',
      repoType: 'monorepo',
    });
  });

  it('returns null when dispatch policy stats not found', async () => {
    (client.query as ReturnType<typeof mock>).mockResolvedValue(null);

    const result = await getDispatchPolicyStats(client, 'unknown', 'unknown', 'unknown');

    expect(result).toBeNull();
  });

  it('lists dispatch policy stats', async () => {
    (client.query as ReturnType<typeof mock>).mockResolvedValue([
      { _id: 'id1', persona: 'executor', taskKind: 'feature', repoType: 'monorepo', sampleCount: 5 },
    ]);

    const result = await listDispatchPolicyStats(client, 50);

    expect(result.length).toBe(1);
    expect(result[0]!.sampleCount).toBe(5);
    const calls = (client.query as ReturnType<typeof mock>).mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toEqual({ limit: 50 });
  });
});

describe('harnessReliabilityStats client', () => {
  let client: ConvexHttpClient;

  beforeEach(() => {
    client = createMockClient();
  });

  it('upserts harness reliability stats', async () => {
    (client.mutation as ReturnType<typeof mock>).mockResolvedValue({
      _id: 'test-id',
      harnessName: 'opencode',
      successRate7d: 0.95,
    });

    const result = await upsertHarnessReliabilityStats(client, {
      harnessName: 'opencode',
      successRate7d: 0.95,
      medianLatencyMs: 1200,
      averageTokens: 1500,
      reviewPassRateByTaskClassJson: JSON.stringify({ feature: 0.9, bug: 0.85 }),
      topFailureModesJson: JSON.stringify(['timeout', 'parse_error']),
      lastUpdatedAt: 1713240000000,
    });

    expect(result.harnessName).toBe('opencode');
    expect(result.successRate7d).toBe(0.95);
    const calls = (client.mutation as ReturnType<typeof mock>).mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toMatchObject({
      harnessName: 'opencode',
      successRate7d: 0.95,
    });
  });

  it('gets harness reliability stats by name', async () => {
    (client.query as ReturnType<typeof mock>).mockResolvedValue({
      _id: 'test-id',
      harnessName: 'opencode',
      successRate7d: 0.95,
    });

    const result = await getHarnessReliabilityStats(client, 'opencode');

    expect(result).not.toBeNull();
    expect(result!.successRate7d).toBe(0.95);
    const calls = (client.query as ReturnType<typeof mock>).mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toEqual({ harnessName: 'opencode' });
  });

  it('returns null when harness reliability stats not found', async () => {
    (client.query as ReturnType<typeof mock>).mockResolvedValue(null);

    const result = await getHarnessReliabilityStats(client, 'unknown');

    expect(result).toBeNull();
  });

  it('lists harness reliability stats', async () => {
    (client.query as ReturnType<typeof mock>).mockResolvedValue([
      { _id: 'id1', harnessName: 'opencode', successRate7d: 0.95 },
    ]);

    const result = await listHarnessReliabilityStats(client, 50);

    expect(result.length).toBe(1);
    expect(result[0]!.successRate7d).toBe(0.95);
    const calls = (client.query as ReturnType<typeof mock>).mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toEqual({ limit: 50 });
  });
});
