/**
 * Retrieve employee performance data for a given project and time window.
 */

export interface EmployeePerformanceData {
  baselines: Array<{
    employeeId: string;
    projectSlug: string;
    taskKind: string;
    avgDurationMs: number;
    p50DurationMs: number;
    p95DurationMs: number;
    completionRate: number;
    sampleCount: number;
    windowStart: number;
    windowEnd: number;
  }>;
  runs: Array<{
    taskId: string;
    employeeId: string;
    status: string;
    startedAt: number;
    finishedAt?: number;
  }>;
}

export interface GetEmployeePerformanceDeps {
  queryBaselines: (args: {
    employeeId: string;
    projectId: string;
    windowDays: number;
  }) => Promise<EmployeePerformanceData['baselines']>;
  queryRuns: (args: {
    employeeId: string;
    projectId: string;
    windowStart: number;
    windowEnd: number;
  }) => Promise<EmployeePerformanceData['runs']>;
}

export interface GetEmployeePerformanceOptions {
  employeeId: string;
  projectId: string;
  windowDays: number;
}

export async function getEmployeePerformance(
  deps: GetEmployeePerformanceDeps,
  options: GetEmployeePerformanceOptions,
): Promise<{ data: EmployeePerformanceData | null; message?: string }> {
  const { employeeId, projectId, windowDays } = options;
  const now = Date.now();
  const windowStart = now - windowDays * 86400000;
  const windowEnd = now;

  const baselines = await deps.queryBaselines({ employeeId, projectId, windowDays });
  const runs = await deps.queryRuns({ employeeId, projectId, windowStart, windowEnd });

  if (baselines.length === 0) {
    return { data: null, message: `No performance baselines found for employee ${employeeId}` };
  }

  return { data: { baselines, runs } };
}
