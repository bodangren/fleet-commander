import type { Doc } from '../_generated/dataModel';

type WorkRun = Doc<'workRuns'>;

/**
 * Calculates the p-th percentile of a sorted number array.
 * @param sorted - Pre-sorted number array
 * @param p - Percentile value (0-100)
 * @returns The p-th percentile value
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

/**
 * Computes p50, p95, p99 percentiles and sample count for a set of values.
 * @param values - Array of numeric values
 * @returns Object with p50, p95, p99, and sampleCount
 */
function computePercentiles(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    sampleCount: sorted.length,
  };
}

/**
 * Breaks down work run timings by pipeline phase (load, score, execute, persist, hooks).
 * @param runs - Array of work run documents
 * @returns Object with percentile breakdowns for each phase
 */
export function computePhaseBreakdown(runs: readonly WorkRun[]) {
  const withTiming = runs.filter(
    (r) =>
      r.loadMs != null &&
      r.scoreMs != null &&
      r.executeMs != null &&
      r.persistMs != null &&
      r.totalMs != null,
  );

  return {
    load: computePercentiles(withTiming.map((r) => r.loadMs!)),
    score: computePercentiles(withTiming.map((r) => r.scoreMs!)),
    execute: computePercentiles(withTiming.map((r) => r.executeMs!)),
    persist: computePercentiles(withTiming.map((r) => r.persistMs!)),
    hookBefore: computePercentiles(
      withTiming.filter((r) => r.hookBeforeMs != null).map((r) => r.hookBeforeMs!),
    ),
    hookAfter: computePercentiles(
      withTiming.filter((r) => r.hookAfterMs != null).map((r) => r.hookAfterMs!),
    ),
    total: computePercentiles(withTiming.map((r) => r.totalMs!)),
  };
}

const MS_PER_DAY = 86400000;

/**
 * Formats a Date to ISO date string (YYYY-MM-DD).
 * @param d - Date object to format
 * @returns ISO date string
 */
function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Computes daily trend data for phase timings over specified number of days.
 * @param runs - Array of work run documents
 * @param now - Current timestamp
 * @param days - Number of days to compute trends for
 * @returns Array of daily trend objects with averages per phase
 */
export function computePhaseTrends(
  runs: readonly WorkRun[],
  now: number,
  days: number,
) {
  const buckets = new Map<
    string,
    {
      load: number[];
      score: number[];
      execute: number[];
      persist: number[];
      hookBefore: number[];
      hookAfter: number[];
      total: number[];
    }
  >();

  for (let i = 0; i < days; i++) {
    const d = new Date(now - i * MS_PER_DAY);
    buckets.set(formatDate(d), {
      load: [],
      score: [],
      execute: [],
      persist: [],
      hookBefore: [],
      hookAfter: [],
      total: [],
    });
  }

  for (const run of runs) {
    if (!run.startedAt) continue;
    const date = formatDate(new Date(run.startedAt));
    const bucket = buckets.get(date);
    if (!bucket) continue;
    if (run.loadMs != null) bucket.load.push(run.loadMs);
    if (run.scoreMs != null) bucket.score.push(run.scoreMs);
    if (run.executeMs != null) bucket.execute.push(run.executeMs);
    if (run.persistMs != null) bucket.persist.push(run.persistMs);
    if (run.hookBeforeMs != null) bucket.hookBefore.push(run.hookBeforeMs);
    if (run.hookAfterMs != null) bucket.hookAfter.push(run.hookAfterMs);
    if (run.totalMs != null) bucket.total.push(run.totalMs);
  }

  const result = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      loadAvg: vals.load.length > 0 ? vals.load.reduce((a, b) => a + b, 0) / vals.load.length : 0,
      scoreAvg: vals.score.length > 0 ? vals.score.reduce((a, b) => a + b, 0) / vals.score.length : 0,
      executeAvg: vals.execute.length > 0 ? vals.execute.reduce((a, b) => a + b, 0) / vals.execute.length : 0,
      persistAvg: vals.persist.length > 0 ? vals.persist.reduce((a, b) => a + b, 0) / vals.persist.length : 0,
      hookBeforeAvg: vals.hookBefore.length > 0 ? vals.hookBefore.reduce((a, b) => a + b, 0) / vals.hookBefore.length : 0,
      hookAfterAvg: vals.hookAfter.length > 0 ? vals.hookAfter.reduce((a, b) => a + b, 0) / vals.hookAfter.length : 0,
      totalAvg: vals.total.length > 0 ? vals.total.reduce((a, b) => a + b, 0) / vals.total.length : 0,
    }));

  return result;
}

/**
 * Computes p50, p95, avg latency stats per agent from work runs.
 * @param runs - Array of work run documents with runnerHost and totalMs
 * @returns Array of latency stats objects per agent
 */
export function computeAgentLatencyStats(runs: readonly WorkRun[]) {
  const byAgent = new Map<string, number[]>();

  for (const run of runs) {
    if (run.runnerHost == null || run.totalMs == null) continue;
    const list = byAgent.get(run.runnerHost) ?? [];
    list.push(run.totalMs);
    byAgent.set(run.runnerHost, list);
  }

  return Array.from(byAgent.entries()).map(([agent, durations]) => {
    const sorted = [...durations].sort((a, b) => a - b);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    return {
      agent,
      p95: percentile(sorted, 95),
      p50: percentile(sorted, 50),
      avg: Math.round(avg),
      runCount: durations.length,
    };
  });
}

export interface SlowAgentOptions {
  thresholdMultiplier?: number;
  minConsecutiveBreaches?: number;
}

/**
 * Detects agents with consecutive latency breaches above threshold multiplier.
 * @param runs - Array of work run documents
 * @param options - Object with thresholdMultiplier (default 1.5) and minConsecutiveBreaches (default 3)
 * @returns Array of slow agent objects with p95 baseline, currentAvg, and breach count
 */
export function detectSlowAgents(
  runs: readonly WorkRun[],
  options: SlowAgentOptions = {},
) {
  const { thresholdMultiplier = 1.5, minConsecutiveBreaches = 3 } = options;

  // Compute p95 baseline per agent
  const baselineByAgent = new Map<string, number>();
  const stats = computeAgentLatencyStats(runs);
  for (const s of stats) {
    baselineByAgent.set(s.agent, s.p95);
  }

  // Group runs by agent, sorted by startedAt desc
  const byAgent = new Map<string, WorkRun[]>();
  for (const run of runs) {
    if (run.runnerHost == null || run.totalMs == null) continue;
    const list = byAgent.get(run.runnerHost) ?? [];
    list.push(run);
    byAgent.set(run.runnerHost, list);
  }

  const slowAgents = [];
  for (const [agent, agentRuns] of byAgent.entries()) {
    const baseline = baselineByAgent.get(agent);
    if (baseline == null || baseline === 0) continue;

    const threshold = baseline * thresholdMultiplier;

    // Sort by startedAt desc (most recent first)
    const sorted = [...agentRuns].sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));

    // Count consecutive breaches from most recent
    let consecutiveBreaches = 0;
    for (const run of sorted) {
      if (run.totalMs != null && run.totalMs > threshold) {
        consecutiveBreaches++;
      } else {
        break;
      }
    }

    if (consecutiveBreaches >= minConsecutiveBreaches) {
      const currentAvg =
        sorted.slice(0, minConsecutiveBreaches).reduce((sum, r) => sum + (r.totalMs ?? 0), 0) /
        minConsecutiveBreaches;
      slowAgents.push({
        agent,
        p95: baseline,
        currentAvg: Math.round(currentAvg),
        threshold: Math.round(threshold),
        consecutiveBreaches,
      });
    }
  }

  return slowAgents;
}

export interface BaselineSnapshot {
  agent: string;
  taskKind: string;
  avgDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  sampleCount: number;
}

/**
 * Infers task kind (orchestration, execution, review) from runner host string
 * @param runnerHost - The runner host string to parse
 * @returns {string} The task kind: 'orchestration', 'execution', 'review', 'general', or 'unknown'
 */
function deriveTaskKind(runnerHost: string | undefined): string {
  if (!runnerHost) return 'unknown';
  if (runnerHost.includes('orchestrator')) return 'orchestration';
  if (runnerHost.includes('executor')) return 'execution';
  if (runnerHost.includes('reviewer')) return 'review';
  return 'general';
}

/**
 * Computes baseline duration snapshots per agent/taskKind over a rolling window
 * @param runs - Array of work runs with timing data
 * @param windowDays - Number of days to look back (default 7)
 * @returns {BaselineSnapshot[]} Array of baseline snapshots with avg, p50, p95 durations
 */
export function computeBaselineSnapshots(
  runs: readonly WorkRun[],
  windowDays: number = 7,
): BaselineSnapshot[] {
  const cutoff = Date.now() - windowDays * MS_PER_DAY;
  const recentRuns = runs.filter((r) => r.startedAt != null && r.startedAt >= cutoff && r.totalMs != null);

  const byAgentAndKind = new Map<string, { durations: number[]; taskKind: string }>();
  for (const run of recentRuns) {
    const agent = run.runnerHost ?? 'unknown';
    const taskKind = deriveTaskKind(run.runnerHost);
    const key = `${agent}::${taskKind}`;
    const entry = byAgentAndKind.get(key) ?? { durations: [], taskKind };
    entry.durations.push(run.totalMs!);
    byAgentAndKind.set(key, entry);
  }

  return Array.from(byAgentAndKind.entries()).map(([key, { durations, taskKind }]) => {
    const sorted = [...durations].sort((a, b) => a - b);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    return {
      agent: key.split('::')[0],
      taskKind,
      avgDurationMs: Math.round(avg),
      p50DurationMs: percentile(sorted, 50),
      p95DurationMs: percentile(sorted, 95),
      sampleCount: durations.length,
    };
  });
}

export interface RegressionAlert {
  agent: string;
  taskKind: string;
  baselineAvgMs: number;
  currentAvgMs: number;
  degradationPercent: number;
  sampleCount: number;
  threshold: number;
}

/**
 * Detects performance regressions by comparing current vs baseline agent latency
 * @param currentRuns - Recent work runs to evaluate
 * @param baselineSnapshots - Historical baseline snapshots to compare against
 * @param degradationThreshold - Threshold for alerting (default 0.2 = 20%)
 * @returns {RegressionAlert[]} Array of alerts for any detected regressions
 */
export function computeRegressions(
  currentRuns: readonly WorkRun[],
  baselineSnapshots: BaselineSnapshot[],
  degradationThreshold: number = 0.2,
): RegressionAlert[] {
  const currentSnapshots = computeBaselineSnapshots(currentRuns);
  const alerts: RegressionAlert[] = [];

  for (const current of currentSnapshots) {
    const baseline = baselineSnapshots.find(
      (b) => b.agent === current.agent && b.taskKind === current.taskKind,
    );
    if (!baseline || baseline.avgDurationMs === 0) continue;

    const degradation = (current.avgDurationMs - baseline.avgDurationMs) / baseline.avgDurationMs;
    if (degradation > degradationThreshold) {
      alerts.push({
        agent: current.agent,
        taskKind: current.taskKind,
        baselineAvgMs: baseline.avgDurationMs,
        currentAvgMs: current.avgDurationMs,
        degradationPercent: Math.round(degradation * 100),
        sampleCount: current.sampleCount,
        threshold: Math.round(degradationThreshold * 100),
      });
    }
  }

  return alerts;
}
