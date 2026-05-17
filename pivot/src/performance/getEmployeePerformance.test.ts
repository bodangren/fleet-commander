import { describe, expect, it, mock, beforeEach } from 'bun:test';
import {
  getEmployeePerformance,
  type GetEmployeePerformanceDeps,
} from './getEmployeePerformance';

describe('getEmployeePerformance', () => {
  it('returns performance data with baselines and runs', async () => {
    const now = Date.now();
    const deps: GetEmployeePerformanceDeps = {
      queryBaselines: mock(async () => [
        {
          employeeId: 'emp-1',
          projectSlug: 'proj-1',
          taskKind: 'feature',
          avgDurationMs: 120,
          p50DurationMs: 110,
          p95DurationMs: 200,
          completionRate: 0.8,
          sampleCount: 10,
          windowStart: now - 7 * 86400000,
          windowEnd: now,
        },
      ]),
      queryRuns: mock(async () => [
        {
          taskId: 'task-1',
          employeeId: 'emp-1',
          status: 'succeeded',
          startedAt: now - 100000,
          finishedAt: now - 90000,
        },
      ]),
    };

    const result = await getEmployeePerformance(deps, {
      employeeId: 'emp-1',
      projectId: 'proj-1',
      windowDays: 7,
    });

    expect(result.data).not.toBeNull();
    expect(result.data!.baselines.length).toBe(1);
    expect(result.data!.baselines[0].taskKind).toBe('feature');
    expect(result.data!.runs.length).toBe(1);
    expect(result.data!.runs[0].taskId).toBe('task-1');
    expect(result.message).toBeUndefined();
  });

  it('returns null data with message when no baselines exist', async () => {
    const deps: GetEmployeePerformanceDeps = {
      queryBaselines: mock(async () => []),
      queryRuns: mock(async () => []),
    };

    const result = await getEmployeePerformance(deps, {
      employeeId: 'emp-1',
      projectId: 'proj-1',
      windowDays: 30,
    });

    expect(result.data).toBeNull();
    expect(result.message).toBeDefined();
    expect(typeof result.message).toBe('string');
  });

  it('queries baselines and runs with correct parameters', async () => {
    const now = Date.now();
    const queryBaselines = mock(async () => []);
    const queryRuns = mock(async () => []);
    const deps: GetEmployeePerformanceDeps = { queryBaselines, queryRuns };

    await getEmployeePerformance(deps, {
      employeeId: 'emp-1',
      projectId: 'proj-1',
      windowDays: 14,
    });

    const baselineCalls = queryBaselines.mock.calls;
    expect(baselineCalls.length).toBe(1);
    expect(baselineCalls[0][0].employeeId).toBe('emp-1');
    expect(baselineCalls[0][0].projectId).toBe('proj-1');
    expect(baselineCalls[0][0].windowDays).toBe(14);

    const runCalls = queryRuns.mock.calls;
    expect(runCalls.length).toBe(1);
    expect(runCalls[0][0].employeeId).toBe('emp-1');
    expect(runCalls[0][0].projectId).toBe('proj-1');
  });

  it('returns runs even when baselines are empty', async () => {
    const now = Date.now();
    const deps: GetEmployeePerformanceDeps = {
      queryBaselines: mock(async () => []),
      queryRuns: mock(async () => [
        {
          taskId: 'task-1',
          employeeId: 'emp-1',
          status: 'succeeded',
          startedAt: now - 100000,
          finishedAt: now - 90000,
        },
      ]),
    };

    const result = await getEmployeePerformance(deps, {
      employeeId: 'emp-1',
      projectId: 'proj-1',
      windowDays: 7,
    });

    expect(result.data).toBeNull();
    expect(result.message).toBeDefined();
  });
});
