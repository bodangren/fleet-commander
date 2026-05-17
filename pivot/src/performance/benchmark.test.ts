import { describe, expect, it } from 'bun:test';

/**
 * Phase 4 benchmark tests — Red phase.
 *
 * These tests import modules that do not yet exist (synthetic dataset
 * generator and benchmark runner). They will fail until the
 * implementation is written in the Green phase.
 */

describe('Phase 4: Performance Benchmark and Optimization', () => {
  it('generates a synthetic 90-day dataset with 1000+ runs', async () => {
    const { generateSyntheticDataset } = await import('./synthetic');
    const dataset = generateSyntheticDataset({
      days: 90,
      employees: 5,
      taskKinds: ['feature', 'bugfix', 'refactor'],
      projects: ['proj-a', 'proj-b'],
    });

    expect(dataset.runs.length).toBeGreaterThanOrEqual(1000);
    expect(new Set(dataset.runs.map((r: any) => r.employeeId)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(dataset.runs.map((r: any) => r.taskKind)).size).toBeGreaterThanOrEqual(2);
    expect(new Set(dataset.runs.map((r: any) => r.projectSlug)).size).toBeGreaterThanOrEqual(1);
  });

  it('benchmarks 90-day getEmployeePerformance query under 2000ms', async () => {
    const { benchmarkEmployeePerformance } = await import('./benchmark');
    const result = await benchmarkEmployeePerformance({
      employeeId: 'emp-1',
      projectId: 'proj-a',
      windowDays: 90,
    });

    expect(result.timingMs).toBeLessThan(2000);
    expect(result.runCount).toBeGreaterThanOrEqual(1000);
    expect(result.baselineCount).toBeGreaterThanOrEqual(1);
  });

  it('benchmarks computeBaselines with 1000+ runs under 2000ms', async () => {
    const { generateSyntheticDataset } = await import('./synthetic');
    const { computeBaselines } = await import('./computeBaselines');

    const dataset = generateSyntheticDataset({
      days: 90,
      employees: 1,
      taskKinds: ['feature'],
      projects: ['proj-a'],
    });

    const start = performance.now();
    await computeBaselines(
      {
        queryRunsByWindow: async () => dataset.runs,
        upsertBaseline: async () => {},
      },
      {
        employeeId: 'emp-1',
        projectSlug: 'proj-a',
        windowDays: 90,
      },
    );
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(2000);
  });

  it('outputs documented timing metrics from benchmark runner', async () => {
    const { benchmarkEmployeePerformance } = await import('./benchmark');
    const result = await benchmarkEmployeePerformance({
      employeeId: 'emp-1',
      projectId: 'proj-a',
      windowDays: 90,
    });

    expect(typeof result.timingMs).toBe('number');
    expect(typeof result.runCount).toBe('number');
    expect(typeof result.baselineCount).toBe('number');
    expect(result).toHaveProperty('startedAt');
    expect(result).toHaveProperty('endedAt');
  });
});
