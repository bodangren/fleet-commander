/**
 * Get employee performance data including baselines and run history for a project and time window.
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
