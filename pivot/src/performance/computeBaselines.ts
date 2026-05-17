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

export async function computeBaselines(
  _deps: ComputeBaselinesDeps,
  _options: ComputeBaselinesOptions,
): Promise<BaselineRecord[]> {
  return [];
}
