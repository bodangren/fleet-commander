/**
 * Compute performance baselines for an employee over a time window.
 */

export interface BaselineRecord {
  employeeId: string;
  projectSlug: string;
  taskKind: string;
  windowStart: number;
  windowEnd: number;
  avgDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  completionRate: number;
  sampleCount: number;
}

export interface ComputeBaselinesDeps {
  queryRunsByWindow: (args: {
    employeeId: string;
    projectSlug: string;
    windowStart: number;
    windowEnd: number;
  }) => Promise<
    Array<{
      employeeId: string;
      taskKind: string;
      startedAt: number;
      completedAt?: number;
      status: string;
      projectSlug: string;
    }>
  >;
  upsertBaseline: (baseline: BaselineRecord) => Promise<void>;
}

export interface ComputeBaselinesOptions {
  employeeId: string;
  projectSlug: string;
  windowDays: number;
  now?: number;
}

import { computePercentiles, computeCompletionRate } from './statistics';

export async function computeBaselines(
  deps: ComputeBaselinesDeps,
  options: ComputeBaselinesOptions,
): Promise<BaselineRecord[]> {
  const { employeeId, projectSlug, windowDays, now = Date.now() } = options;
  const windowStart = now - windowDays * 86400000;
  const windowEnd = now;

  const runs = await deps.queryRunsByWindow({ employeeId, projectSlug, windowStart, windowEnd });

  const withinWindow = runs.filter((r) => r.startedAt >= windowStart && r.startedAt < windowEnd);

  const byTaskKind = new Map<string, typeof withinWindow>();
  for (const run of withinWindow) {
    const list = byTaskKind.get(run.taskKind) ?? [];
    list.push(run);
    byTaskKind.set(run.taskKind, list);
  }

  const results: BaselineRecord[] = [];

  for (const [taskKind, taskRuns] of byTaskKind.entries()) {
    const completedRuns = taskRuns.filter((r) => r.status === 'completed' && r.completedAt != null);
    const durations = completedRuns.map((r) => r.completedAt! - r.startedAt);
    const percentiles = computePercentiles(durations);
    const completed = completedRuns.length;
    const total = taskRuns.length;
    const completionRate = computeCompletionRate(completed, total);

    const baseline: BaselineRecord = {
      employeeId,
      projectSlug,
      taskKind,
      windowStart,
      windowEnd,
      avgDurationMs: percentiles.avg,
      p50DurationMs: percentiles.p50,
      p95DurationMs: percentiles.p95,
      completionRate,
      sampleCount: total,
    };

    results.push(baseline);
    await deps.upsertBaseline(baseline);
  }

  return results;
}
