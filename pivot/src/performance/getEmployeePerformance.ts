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
  _deps: GetEmployeePerformanceDeps,
  _options: GetEmployeePerformanceOptions,
): Promise<{ data: EmployeePerformanceData | null; message?: string }> {
  return { data: null, message: 'Not implemented' };
}
