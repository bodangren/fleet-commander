import type { BaselineRecord } from './computeBaselines';

export interface PerformanceRunRecord {
  taskId: string;
  employeeId: string;
  status: string;
  startedAt: number;
  finishedAt?: number;
}

export interface EmployeePerformanceData {
  baselines: BaselineRecord[];
  runs: PerformanceRunRecord[];
}

export interface GetEmployeePerformanceDeps {
  queryBaselines(args: {
    employeeId: string;
    projectId: string;
    windowDays: number;
  }): Promise<BaselineRecord[]>;
  queryRuns(args: {
    employeeId: string;
    projectId: string;
    windowStart: number;
    windowEnd: number;
  }): Promise<PerformanceRunRecord[]>;
}

export interface GetEmployeePerformanceOptions {
  employeeId: string;
  projectId: string;
  windowDays: number;
}

/**
 * Get employee performance data including baselines and run history.
 * @param deps - Data access functions for baselines and runs
 * @param options - Employee, project, and time-window options
 * @returns Performance data, or a message when baselines are unavailable
 */
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
