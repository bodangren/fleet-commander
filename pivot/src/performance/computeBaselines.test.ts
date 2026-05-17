import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { computeBaselines, type ComputeBaselinesDeps } from './computeBaselines';
import { makeFakeRun } from '../__fixtures__/performance-fixtures';

function createMockDeps(overrides?: Partial<ComputeBaselinesDeps>): ComputeBaselinesDeps {
  return {
    queryRunsByWindow: mock(async () => []),
    upsertBaseline: mock(async () => {}),
    ...overrides,
  };
}

describe('computeBaselines', () => {
  it('computes avg, p50, p95 and completion rate per taskKind', async () => {
    const now = Date.now();
    const deps = createMockDeps({
      queryRunsByWindow: mock(async () => [
        makeFakeRun({
          employeeId: 'emp-1',
          taskKind: 'feature',
          startedAt: now - 100000,
          completedAt: now - 90000,
          status: 'completed',
          projectSlug: 'proj-1',
        }),
        makeFakeRun({
          employeeId: 'emp-1',
          taskKind: 'feature',
          startedAt: now - 80000,
          completedAt: now - 70000,
          status: 'completed',
          projectSlug: 'proj-1',
        }),
        makeFakeRun({
          employeeId: 'emp-1',
          taskKind: 'feature',
          startedAt: now - 60000,
          status: 'failed',
          projectSlug: 'proj-1',
        }),
        makeFakeRun({
          employeeId: 'emp-1',
          taskKind: 'bugfix',
          startedAt: now - 50000,
          completedAt: now - 45000,
          status: 'completed',
          projectSlug: 'proj-1',
        }),
      ]),
    });

    const result = await computeBaselines(deps, {
      employeeId: 'emp-1',
      projectSlug: 'proj-1',
      windowDays: 7,
      now,
    });

    expect(result.length).toBe(2);

    const feature = result.find((r) => r.taskKind === 'feature');
    expect(feature).toBeDefined();
    expect(feature!.avgDurationMs).toBeGreaterThan(0);
    expect(feature!.p50DurationMs).toBeGreaterThan(0);
    expect(feature!.p95DurationMs).toBeGreaterThan(0);
    expect(feature!.completionRate).toBeCloseTo(2 / 3, 5);
    expect(feature!.sampleCount).toBe(3);

    const bugfix = result.find((r) => r.taskKind === 'bugfix');
    expect(bugfix).toBeDefined();
    expect(bugfix!.sampleCount).toBe(1);

    const upsertCalls = (deps.upsertBaseline as ReturnType<typeof mock>).mock.calls;
    expect(upsertCalls.length).toBe(2);
  });

  it('queries runs for the correct time window', async () => {
    const now = Date.now();
    const queryRunsByWindow = mock(async () => []);
    const deps = createMockDeps({ queryRunsByWindow });

    await computeBaselines(deps, {
      employeeId: 'emp-1',
      projectSlug: 'proj-1',
      windowDays: 14,
      now,
    });

    const calls = queryRunsByWindow.mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][0].employeeId).toBe('emp-1');
    expect(calls[0][0].projectSlug).toBe('proj-1');
    expect(calls[0][0].windowStart).toBe(now - 14 * 86400000);
    expect(calls[0][0].windowEnd).toBe(now);
  });

  it('returns empty array and skips upsert when no runs exist', async () => {
    const deps = createMockDeps();
    const result = await computeBaselines(deps, {
      employeeId: 'emp-1',
      projectSlug: 'proj-1',
      windowDays: 7,
    });

    expect(result).toEqual([]);
    const upsertCalls = (deps.upsertBaseline as ReturnType<typeof mock>).mock.calls;
    expect(upsertCalls.length).toBe(0);
  });

  it('returns empty array and skips upsert when all runs are outside the window', async () => {
    const now = Date.now();
    const deps = createMockDeps({
      queryRunsByWindow: mock(async () => [
        makeFakeRun({
          employeeId: 'emp-1',
          startedAt: now - 30 * 86400000,
          status: 'completed',
          projectSlug: 'proj-1',
        }),
      ]),
    });

    const result = await computeBaselines(deps, {
      employeeId: 'emp-1',
      projectSlug: 'proj-1',
      windowDays: 7,
      now,
    });

    expect(result).toEqual([]);
    const upsertCalls = (deps.upsertBaseline as ReturnType<typeof mock>).mock.calls;
    expect(upsertCalls.length).toBe(0);
  });
});
