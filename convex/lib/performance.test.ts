import { describe, it, expect } from 'vitest';
import { computePhaseBreakdown, computePhaseTrends, computeAgentLatencyStats, detectSlowAgents } from './performance';
import type { Doc } from '../../_generated/dataModel';

type WorkRun = Doc<'workRuns'>;

function makeRun(partial: Partial<WorkRun> & { startedAt: number }): WorkRun {
  return {
    _id: 'run_123' as any,
    _creationTime: Date.now(),
    projectSlug: 'test',
    runId: 'run-1',
    status: 'succeeded',
    selectedTaskKey: 'task-1',
    runnerHost: partial.runnerHost,
    startedAt: partial.startedAt,
    finishedAt: partial.finishedAt,
    loadMs: partial.loadMs,
    scoreMs: partial.scoreMs,
    executeMs: partial.executeMs,
    persistMs: partial.persistMs,
    hookBeforeMs: partial.hookBeforeMs,
    hookAfterMs: partial.hookAfterMs,
    totalMs: partial.totalMs,
    // sessionResumeMs removed — stub metric
  } as WorkRun;
}

describe('computePhaseBreakdown', () => {
  it('returns zero percentiles for empty input', () => {
    const result = computePhaseBreakdown([]);
    expect(result.load.p50).toBe(0);
    expect(result.load.p95).toBe(0);
    expect(result.load.p99).toBe(0);
  });

  it('computes percentiles for a single run', () => {
    const runs = [
      makeRun({ startedAt: Date.now(), loadMs: 100, scoreMs: 200, executeMs: 300, persistMs: 50, totalMs: 650 }),
    ];
    const result = computePhaseBreakdown(runs);
    expect(result.load.p50).toBe(100);
    expect(result.score.p50).toBe(200);
    expect(result.execute.p50).toBe(300);
    expect(result.persist.p50).toBe(50);
    expect(result.total.p50).toBe(650);
  });

  it('computes p50/p95/p99 across multiple runs', () => {
    const runs = [
      makeRun({ startedAt: Date.now(), loadMs: 10, scoreMs: 20, executeMs: 30, persistMs: 5, totalMs: 65 }),
      makeRun({ startedAt: Date.now(), loadMs: 20, scoreMs: 40, executeMs: 60, persistMs: 10, totalMs: 130 }),
      makeRun({ startedAt: Date.now(), loadMs: 30, scoreMs: 60, executeMs: 90, persistMs: 15, totalMs: 195 }),
      makeRun({ startedAt: Date.now(), loadMs: 40, scoreMs: 80, executeMs: 120, persistMs: 20, totalMs: 260 }),
      makeRun({ startedAt: Date.now(), loadMs: 50, scoreMs: 100, executeMs: 150, persistMs: 25, totalMs: 325 }),
    ];
    const result = computePhaseBreakdown(runs);
    expect(result.load.p50).toBe(30);
    expect(result.load.p95).toBe(50);
    expect(result.load.p99).toBe(50);
    expect(result.execute.p95).toBe(150);
  });

  it('ignores runs with missing timing fields', () => {
    const runs = [
      makeRun({ startedAt: Date.now(), loadMs: 100, scoreMs: 200, executeMs: 300, persistMs: 50, totalMs: 650 }),
      makeRun({ startedAt: Date.now(), loadMs: 100 }), // missing most fields
    ];
    const result = computePhaseBreakdown(runs);
    expect(result.load.p50).toBe(100);
    expect(result.score.p50).toBe(200);
    expect(result.execute.p50).toBe(300);
  });

  it('excludes partial runs with 3+ data points', () => {
    const runs = [
      makeRun({ startedAt: Date.now(), loadMs: 10, scoreMs: 20, executeMs: 30, persistMs: 5, totalMs: 65 }),
      makeRun({ startedAt: Date.now(), loadMs: 20, scoreMs: 40, executeMs: 60, persistMs: 10, totalMs: 130 }),
      makeRun({ startedAt: Date.now(), loadMs: 30, scoreMs: 40 }), // missing execute/persist/total
      makeRun({ startedAt: Date.now(), loadMs: 40, scoreMs: 80, executeMs: 120, persistMs: 20, totalMs: 260 }),
    ];
    const result = computePhaseBreakdown(runs);
    // withTiming excludes partial runs (missing execute/persist/total)
    // load has 3 values: [10,20,40]; p50 = 20
    expect(result.load.p50).toBe(20);
    // execute has 3 values: [30,60,120]; p50 = 60
    expect(result.execute.p50).toBe(60);
  });

  it('handles hook timings separately', () => {
    const runs = [
      makeRun({ startedAt: Date.now(), loadMs: 100, scoreMs: 200, executeMs: 300, persistMs: 50, totalMs: 650, hookBeforeMs: 10, hookAfterMs: 20 }),
      makeRun({ startedAt: Date.now(), loadMs: 100, scoreMs: 200, executeMs: 300, persistMs: 50, totalMs: 650 }), // no hooks
    ];
    const result = computePhaseBreakdown(runs);
    expect(result.hookBefore.p50).toBe(10);
    expect(result.hookAfter.p50).toBe(20);
  });
});

describe('computePhaseTrends', () => {
  const now = new Date('2026-05-04T12:00:00Z').getTime();

  it('returns empty averages for all days when no runs', () => {
    const result = computePhaseTrends([], now, 7);
    expect(result).toHaveLength(7);
    expect(result[0].loadAvg).toBe(0);
    expect(result[0].totalAvg).toBe(0);
  });

  it('buckets runs by date and computes averages', () => {
    const runs = [
      makeRun({ startedAt: now, loadMs: 100, scoreMs: 200, executeMs: 300, persistMs: 50, totalMs: 650 }),
      makeRun({ startedAt: now, loadMs: 200, scoreMs: 400, executeMs: 600, persistMs: 100, totalMs: 1300 }),
      makeRun({ startedAt: now - 86400000, loadMs: 50, scoreMs: 100, executeMs: 150, persistMs: 25, totalMs: 325 }),
    ];
    const result = computePhaseTrends(runs, now, 7);
    const today = result.find((r) => r.date === '2026-05-04');
    const yesterday = result.find((r) => r.date === '2026-05-03');
    expect(today?.loadAvg).toBe(150);
    expect(today?.totalAvg).toBe(975);
    expect(yesterday?.loadAvg).toBe(50);
    expect(yesterday?.totalAvg).toBe(325);
  });

  it('ignores runs outside the date range', () => {
    const runs = [
      makeRun({ startedAt: now, loadMs: 100, totalMs: 650 }),
      makeRun({ startedAt: now - 10 * 86400000, loadMs: 999, totalMs: 9999 }),
    ];
    const result = computePhaseTrends(runs, now, 7);
    const today = result.find((r) => r.date === '2026-05-04');
    expect(today?.loadAvg).toBe(100);
  });

  it('handles hook averages correctly', () => {
    const runs = [
      makeRun({ startedAt: now, loadMs: 100, scoreMs: 200, executeMs: 300, persistMs: 50, totalMs: 650, hookBeforeMs: 10, hookAfterMs: 20 }),
      makeRun({ startedAt: now, loadMs: 200, scoreMs: 400, executeMs: 600, persistMs: 100, totalMs: 1300 }),
    ];
    const result = computePhaseTrends(runs, now, 7);
    const today = result.find((r) => r.date === '2026-05-04');
    expect(today?.hookBeforeAvg).toBe(10);
    expect(today?.hookAfterAvg).toBe(20);
    expect(today?.loadAvg).toBe(150);
  });
});

describe('computeAgentLatencyStats', () => {
  const now = Date.now();

  it('returns empty array for no runs', () => {
    expect(computeAgentLatencyStats([])).toEqual([]);
  });

  it('groups runs by agent and computes stats', () => {
    const runs = [
      makeRun({ startedAt: now, runnerHost: 'agent-a', totalMs: 100 }),
      makeRun({ startedAt: now, runnerHost: 'agent-a', totalMs: 200 }),
      makeRun({ startedAt: now, runnerHost: 'agent-b', totalMs: 300 }),
    ];
    const result = computeAgentLatencyStats(runs);
    expect(result).toHaveLength(2);
    const agentA = result.find((r) => r.agent === 'agent-a');
    expect(agentA?.runCount).toBe(2);
    expect(agentA?.avg).toBe(150);
    expect(agentA?.p50).toBe(100); // median of [100, 200] = lower value
    expect(agentA?.p95).toBe(200);
  });

  it('ignores runs without totalMs or runnerHost', () => {
    const runs = [
      makeRun({ startedAt: now, runnerHost: 'agent-a', totalMs: 100 }),
      makeRun({ startedAt: now, runnerHost: 'agent-a' }),
      makeRun({ startedAt: now, totalMs: 200 }),
    ];
    const result = computeAgentLatencyStats(runs);
    expect(result).toHaveLength(1);
    expect(result[0].runCount).toBe(1);
  });
});

describe('detectSlowAgents', () => {
  const now = Date.now();

  it('returns empty array when no agents breach threshold', () => {
    const runs = [
      makeRun({ startedAt: now, runnerHost: 'agent-a', totalMs: 100 }),
      makeRun({ startedAt: now, runnerHost: 'agent-a', totalMs: 100 }),
      makeRun({ startedAt: now, runnerHost: 'agent-a', totalMs: 100 }),
    ];
    expect(detectSlowAgents(runs)).toEqual([]);
  });

  it('detects agent with 3+ consecutive breaches', () => {
    // Establish baseline with many fast runs so p95 stays low (need >95% fast)
    const runs: WorkRun[] = [];
    for (let i = 0; i < 100; i++) {
      runs.push(makeRun({ startedAt: now - i * 10000, runnerHost: 'agent-a', totalMs: 100 }));
    }
    // Add 3 recent slow runs that exceed 1.5x p95 (p95 = 100, threshold = 150)
    runs.push(makeRun({ startedAt: now + 1000, runnerHost: 'agent-a', totalMs: 200 }));
    runs.push(makeRun({ startedAt: now + 2000, runnerHost: 'agent-a', totalMs: 200 }));
    runs.push(makeRun({ startedAt: now + 3000, runnerHost: 'agent-a', totalMs: 200 }));

    const result = detectSlowAgents(runs, { thresholdMultiplier: 1.5, minConsecutiveBreaches: 3 });
    expect(result).toHaveLength(1);
    expect(result[0].agent).toBe('agent-a');
    expect(result[0].consecutiveBreaches).toBe(3);
  });

  it('stops counting consecutive breaches on first non-breach', () => {
    const runs = [
      makeRun({ startedAt: now, runnerHost: 'agent-a', totalMs: 500 }),
      makeRun({ startedAt: now - 1000, runnerHost: 'agent-a', totalMs: 100 }),
      makeRun({ startedAt: now - 2000, runnerHost: 'agent-a', totalMs: 500 }),
      makeRun({ startedAt: now - 3000, runnerHost: 'agent-a', totalMs: 500 }),
    ];
    const result = detectSlowAgents(runs, { thresholdMultiplier: 1.5, minConsecutiveBreaches: 2 });
    // Only 1 consecutive breach at the start (500), then 100 breaks it
    expect(result).toHaveLength(0);
  });

  it('uses custom threshold multiplier', () => {
    const runs: WorkRun[] = [];
    for (let i = 0; i < 100; i++) {
      runs.push(makeRun({ startedAt: now - i * 10000, runnerHost: 'agent-a', totalMs: 100 }));
    }
    // p95 = 100, threshold = 100 * 1.0 = 100, so 200 > 100 = breach
    runs.push(makeRun({ startedAt: now + 1000, runnerHost: 'agent-a', totalMs: 200 }));
    runs.push(makeRun({ startedAt: now + 2000, runnerHost: 'agent-a', totalMs: 200 }));
    runs.push(makeRun({ startedAt: now + 3000, runnerHost: 'agent-a', totalMs: 200 }));

    const result = detectSlowAgents(runs, { thresholdMultiplier: 1.0, minConsecutiveBreaches: 3 });
    expect(result).toHaveLength(1);
    expect(result[0].consecutiveBreaches).toBe(3);
  });

  it('requires minimum consecutive breaches', () => {
    const runs = [
      makeRun({ startedAt: now, runnerHost: 'agent-a', totalMs: 100 }),
      makeRun({ startedAt: now - 1000, runnerHost: 'agent-a', totalMs: 100 }),
      makeRun({ startedAt: now - 2000, runnerHost: 'agent-a', totalMs: 500 }),
      makeRun({ startedAt: now - 3000, runnerHost: 'agent-a', totalMs: 500 }),
    ];
    // Only 2 consecutive breaches, min is 3
    const result = detectSlowAgents(runs, { thresholdMultiplier: 1.5, minConsecutiveBreaches: 3 });
    expect(result).toHaveLength(0);
  });
});
