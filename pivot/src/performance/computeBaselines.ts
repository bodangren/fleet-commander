/**
 * Compute performance baselines for an employee over a time window grouped by task kind.
 */
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
