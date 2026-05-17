/**
 * Benchmark runner for employee performance queries.
 */

import { generateSyntheticDataset, type SyntheticDataset } from './synthetic';
import { getEmployeePerformance, type GetEmployeePerformanceDeps } from './getEmployeePerformance';
import { computeBaselines, type ComputeBaselinesDeps } from './computeBaselines';

export interface BenchmarkResult {
  timingMs: number;
  runCount: number;
  baselineCount: number;
  startedAt: number;
  endedAt: number;
}

export interface BenchmarkOptions {
  employeeId: string;
  projectId: string;
  windowDays: number;
}

function buildBaselineQuery(deps: {
  runs: SyntheticDataset['runs'];
  windowDays: number;
}): (args: { employeeId: string; projectId: string; windowDays: number }) => Promise<any[]> {
  return async ({ employeeId, projectId, windowDays: _windowDays }) => {
    const now = Date.now();
    const windowStart = now - _windowDays * 86400000;
    const windowEnd = now;
    const byTaskKind = new Map<string, any[]>();

    for (const run of deps.runs) {
      if (run.employeeId !== employeeId) continue;
      if (run.startedAt < windowStart || run.startedAt >= windowEnd) continue;
      const key = run.taskKind;
      const list = byTaskKind.get(key) ?? [];
      list.push(run);
      byTaskKind.set(key, list);
    }

    return Array.from(byTaskKind.entries()).map(([taskKind, taskRuns]) => {
      const completed = taskRuns.filter(r => r.status === 'completed' && r.completedAt != null);
      const durations = completed.map(r => r.completedAt! - r.startedAt);
      const avgDurationMs = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
      const sorted = [...durations].sort((a, b) => a - b);
      const p50 = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
      const p95 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0;

      return {
        employeeId,
        projectSlug: projectId,
        taskKind,
        avgDurationMs: Math.round(avgDurationMs),
        p50DurationMs: p50,
        p95DurationMs: p95,
        completionRate: taskRuns.length > 0 ? completed.length / taskRuns.length : 0,
        sampleCount: taskRuns.length,
        windowStart,
        windowEnd,
      };
    });
  };
}

function buildRunQuery(deps: { runs: SyntheticDataset['runs'] }): (args: { employeeId: string; projectId: string; windowStart: number; windowEnd: number }) => Promise<any[]> {
  return async ({ employeeId, windowStart, windowEnd }) => {
    return deps.runs
      .filter(r => {
        if (r.employeeId !== employeeId) return false;
        if (r.startedAt < windowStart || r.startedAt >= windowEnd) return false;
        return true;
      })
      .map(r => ({
        taskId: `task-${r.startedAt}`,
        employeeId: r.employeeId,
        status: r.status,
        startedAt: r.startedAt,
        finishedAt: r.completedAt,
      }));
  };
}

export async function benchmarkEmployeePerformance(options: BenchmarkOptions): Promise<BenchmarkResult> {
  const { employeeId, projectId, windowDays } = options;

  const dataset = generateSyntheticDataset({
    days: 90,
    employees: 5,
    taskKinds: ['feature', 'bugfix', 'refactor'],
    projects: ['proj-a', 'proj-b'],
  });

  const startedAt = Date.now();

  const deps: GetEmployeePerformanceDeps = {
    queryBaselines: buildBaselineQuery({ runs: dataset.runs, windowDays }),
    queryRuns: buildRunQuery({ runs: dataset.runs }),
  };

  await getEmployeePerformance(deps, { employeeId, projectId, windowDays });

  const baselineCount = (await deps.queryBaselines({ employeeId, projectId, windowDays })).length;
  const runCount = dataset.runs.filter(r => r.employeeId === employeeId).length;

  const endedAt = Date.now();
  const timingMs = endedAt - startedAt;

  return { timingMs, runCount, baselineCount, startedAt, endedAt };
}

export async function benchmarkComputeBaselines(
  options: BenchmarkOptions,
): Promise<{ timingMs: number; runCount: number }> {
  const { employeeId, projectId, windowDays } = options;

  const dataset = generateSyntheticDataset({
    days: 90,
    employees: 1,
    taskKinds: ['feature'],
    projects: ['proj-a'],
  });

  const start = performance.now();

  const deps: ComputeBaselinesDeps = {
    queryRunsByWindow: async ({ employeeId: empId, windowStart, windowEnd }) => {
      return dataset.runs
        .filter(r => r.employeeId === empId && r.startedAt >= windowStart && r.startedAt < windowEnd)
        .map(r => ({
          employeeId: r.employeeId,
          taskKind: r.taskKind,
          startedAt: r.startedAt,
          completedAt: r.completedAt,
          status: r.status,
          projectSlug: r.projectSlug,
        }));
    },
    upsertBaseline: async () => {},
  };

  await computeBaselines(deps, { employeeId, projectSlug: projectId, windowDays });

  const timingMs = performance.now() - start;
  const runCount = dataset.runs.length;

  return { timingMs, runCount };
}