import { describe, expect, it, mock } from 'bun:test';
import { detectRegressions, type DetectRegressionsDeps } from './detectRegressions';
import type { BaselineRecord } from './computeBaselines';

/**
 * Creates mock DetectRegressionsDeps for testing detectRegressions.
 */
function createMockDeps(overrides?: Partial<DetectRegressionsDeps>): DetectRegressionsDeps {
  return {
    queryCurrentBaselines: mock(async () => []),
    queryPreviousBaselines: mock(async () => []),
    createAlert: mock(async () => 'alert_123'),
    ...overrides,
  };
}

/**
 * Creates a mock BaselineRecord for testing detectRegressions.
 */
function makeBaseline(overrides: Partial<BaselineRecord> = {}): BaselineRecord {
  const now = Date.now();
  return {
    employeeId: 'emp-1',
    projectSlug: 'proj-1',
    taskKind: 'feature',
    windowStart: now - 7 * 86400000,
    windowEnd: now,
    avgDurationMs: 100,
    p50DurationMs: 95,
    p95DurationMs: 150,
    completionRate: 0.9,
    sampleCount: 10,
    ...overrides,
  };
}

describe('detectRegressions', () => {
  it('creates a performance_regression alert when duration degrades >20%', async () => {
    const deps = createMockDeps({
      queryCurrentBaselines: mock(async () => [
        makeBaseline({ avgDurationMs: 150, completionRate: 0.9, sampleCount: 10 }),
      ]),
      queryPreviousBaselines: mock(async () => [
        makeBaseline({ avgDurationMs: 100, completionRate: 0.9, sampleCount: 10 }),
      ]),
    });

    const result = await detectRegressions(deps, {
      employeeId: 'emp-1',
      projectSlug: 'proj-1',
      windowDays: 7,
    });

    expect(result.length).toBeGreaterThanOrEqual(1);
    const durationAlert = result.find((r) => r.metric === 'avgDurationMs');
    expect(durationAlert).toBeDefined();
    expect(durationAlert!.alerted).toBe(true);
    expect(durationAlert!.severity).toBe('critical');
    expect(durationAlert!.degradationPercent).toBe(50);

    const alertCalls = (deps.createAlert as ReturnType<typeof mock>).mock.calls;
    expect(alertCalls.length).toBeGreaterThanOrEqual(1);
    expect(alertCalls[0][0].type).toBe('performance_regression');
  });

  it('creates a performance_regression alert when completion rate drops >15%', async () => {
    const deps = createMockDeps({
      queryCurrentBaselines: mock(async () => [
        makeBaseline({ avgDurationMs: 100, completionRate: 0.7, sampleCount: 10 }),
      ]),
      queryPreviousBaselines: mock(async () => [
        makeBaseline({ avgDurationMs: 100, completionRate: 0.9, sampleCount: 10 }),
      ]),
    });

    const result = await detectRegressions(deps, {
      employeeId: 'emp-1',
      projectSlug: 'proj-1',
      windowDays: 7,
    });

    expect(result.length).toBeGreaterThanOrEqual(1);
    const rateAlert = result.find((r) => r.metric === 'completionRate');
    expect(rateAlert).toBeDefined();
    expect(rateAlert!.alerted).toBe(true);
    expect(rateAlert!.severity).toBe('warning');

    const alertCalls = (deps.createAlert as ReturnType<typeof mock>).mock.calls;
    expect(alertCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty array and creates no alerts when metrics are within normal variance', async () => {
    const deps = createMockDeps({
      queryCurrentBaselines: mock(async () => [
        makeBaseline({ avgDurationMs: 105, completionRate: 0.88, sampleCount: 10 }),
      ]),
      queryPreviousBaselines: mock(async () => [
        makeBaseline({ avgDurationMs: 100, completionRate: 0.9, sampleCount: 10 }),
      ]),
    });

    const result = await detectRegressions(deps, {
      employeeId: 'emp-1',
      projectSlug: 'proj-1',
      windowDays: 7,
    });

    expect(result).toEqual([]);
    const alertCalls = (deps.createAlert as ReturnType<typeof mock>).mock.calls;
    expect(alertCalls.length).toBe(0);
  });

  it('skips alerting when sampleCount is below 5 to avoid noisy alerts', async () => {
    const deps = createMockDeps({
      queryCurrentBaselines: mock(async () => [
        makeBaseline({ avgDurationMs: 150, completionRate: 0.7, sampleCount: 3 }),
      ]),
      queryPreviousBaselines: mock(async () => [
        makeBaseline({ avgDurationMs: 100, completionRate: 0.9, sampleCount: 10 }),
      ]),
    });

    const result = await detectRegressions(deps, {
      employeeId: 'emp-1',
      projectSlug: 'proj-1',
      windowDays: 7,
    });

    expect(result).toEqual([]);
    const alertCalls = (deps.createAlert as ReturnType<typeof mock>).mock.calls;
    expect(alertCalls.length).toBe(0);
  });

  it('handles missing previous baseline gracefully without crashing', async () => {
    const deps = createMockDeps({
      queryCurrentBaselines: mock(async () => [
        makeBaseline({ avgDurationMs: 150, completionRate: 0.7, sampleCount: 10 }),
      ]),
      queryPreviousBaselines: mock(async () => []),
    });

    const result = await detectRegressions(deps, {
      employeeId: 'emp-1',
      projectSlug: 'proj-1',
      windowDays: 7,
    });

    expect(result).toEqual([]);
    const alertCalls = (deps.createAlert as ReturnType<typeof mock>).mock.calls;
    expect(alertCalls.length).toBe(0);
  });
});
