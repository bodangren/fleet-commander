import type { Doc } from '../_generated/dataModel';

type WorkRun = Doc<'workRuns'>;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function computePercentiles(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    sampleCount: sorted.length,
  };
}

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

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

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

function deriveTaskKind(runnerHost: string | undefined): string {
  if (!runnerHost) return 'unknown';
  if (runnerHost.includes('orchestrator')) return 'orchestration';
  if (runnerHost.includes('executor')) return 'execution';
  if (runnerHost.includes('reviewer')) return 'review';
  return 'general';
}

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
