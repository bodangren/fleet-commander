import type { DispatchPolicyStatsInput, HarnessReliabilityStatsInput } from './statsClient';

export interface RunContractRecord {
  taskId: string;
  projectSlug: string;
  createdAt: number;
  harnessName?: string;
  architectOutput?: string;
  architectConfidence?: number;
  costUsd?: number;
  architectAssumptions?: string[];
  executorChangedFiles?: string[];
  executorTestsRun?: string[];
  executorUnresolvedAssumptions?: string[];
  executorConfidence?: number;
  executorBranch?: string;
  executorCommit?: string;
  executorStatus?: 'succeeded' | 'failed';
  reviewerStatus?: 'passed' | 'failed' | 'needs-changes';
  reviewerSummary?: string;
  reviewerIssueClass?: 'correctness' | 'security' | 'performance' | 'style' | 'spec_mismatch';
  reviewerSeverity?: 'blocker' | 'major' | 'minor';
  recoveryAction?: 'retry' | 'escalate' | 'split' | 'replan' | 'human_review';
  recoveryReason?: string;
  dispatchRejections?: Array<{ taskKey: string; filter: string; reason: string }>;
}

export interface RollupOptions {
  windowDays: number;
  minSampleCount: number;
  insufficientDataThreshold: number;
}

const DEFAULT_OPTIONS: RollupOptions = {
  windowDays: 7,
  minSampleCount: 5,
  insufficientDataThreshold: 10,
};

/**
 * Classify task as bug, chore, review, or feature based on taskId string patterns
 * @param taskId - The task identifier to classify
 * @returns Task kind: 'bug', 'chore', 'review', or 'feature'
 */
export function deriveTaskKind(taskId: string): string {
  const lower = taskId.toLowerCase();
  if (lower.includes('bug') || lower.includes('fix')) return 'bug';
  if (lower.includes('chore') || lower.includes('cleanup') || lower.includes('maintenance')) return 'chore';
  if (lower.includes('review')) return 'review';
  return 'feature';
}

/**
 * Classify project slug as monorepo, multirepo, or default based on name patterns
 * @param projectSlug - The project identifier to classify
 * @returns Repo type: 'monorepo', 'multirepo', or 'default'
 */
export function deriveRepoType(projectSlug: string): string {
  const lower = projectSlug.toLowerCase();
  if (lower.includes('mono') || lower.includes('mono-repo')) return 'monorepo';
  if (lower.includes('multi') || lower.includes('poly')) return 'multirepo';
  return 'default';
}

/**
 * Determine which persona (architect, executor, reviewer, recovery) a run contract record belongs to
 * @param record - Run contract record to analyze
 * @returns Persona type based on which stage output is present
 */
export function derivePersona(
  record: RunContractRecord,
): 'architect' | 'executor' | 'reviewer' | 'recovery' {
  if (record.recoveryAction) return 'recovery';
  if (record.reviewerStatus) return 'reviewer';
  if (record.executorStatus) return 'executor';
  if (record.architectOutput) return 'architect';
  return 'executor';
}

/**
 * Calculates p-th percentile of a numeric array
 * @param values - Array of numeric values
 * @param p - Percentile to calculate (0-100)
 * @returns The p-th percentile value, or 0 if array is empty
 */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculates arithmetic mean of a numeric array
 * @param values - Array of numeric values
 * @returns The mean value, or 0 if array is empty
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculates rate of occurrence of a target value in an array
 * @param values - Array of string values to check
 * @param target - Target value to count occurrences of
 * @returns Ratio of target occurrences to total length (0 if empty array)
 */
function rate(values: string[], target: string): number {
  if (values.length === 0) return 0;
  return values.filter((v) => v === target).length / values.length;
}

export interface DispatchPolicyBucket {
  persona: string;
  taskKind: string;
  repoType: string;
  records: RunContractRecord[];
}

/**
 * Group run contract records into dispatch buckets keyed by persona::taskKind::repoType
 * @param records - Array of run contract records to group
 * @returns Map of bucket key to DispatchPolicyBucket containing persona, taskKind, repoType and records
 */
export function groupByDispatchBucket(
  records: RunContractRecord[],
): Map<string, DispatchPolicyBucket> {
  const buckets = new Map<string, DispatchPolicyBucket>();

  for (const record of records) {
    const persona = derivePersona(record);
    const taskKind = deriveTaskKind(record.taskId);
    const repoType = deriveRepoType(record.projectSlug);
    const key = `${persona}::${taskKind}::${repoType}`;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { persona, taskKind, repoType, records: [] };
      buckets.set(key, bucket);
    }
    bucket.records.push(record);
  }

  return buckets;
}

export interface ComputeDispatchPolicyStatsOptions extends Partial<RollupOptions> {
  now?: number;
}

/**
 * Aggregate run contract records into dispatch policy statistics buckets by persona, taskKind, and repoType
 * @param records - Array of run contract records to aggregate
 * @param options - Optional configuration (windowDays, minSampleCount, insufficientDataThreshold, now)
 * @returns Array of DispatchPolicyStatsInput objects with aggregated statistics
 */
export function computeDispatchPolicyStats(
  records: RunContractRecord[],
  options: ComputeDispatchPolicyStatsOptions = {},
): DispatchPolicyStatsInput[] {
  const { windowDays = 7, minSampleCount = 5, insufficientDataThreshold = 10, now = Date.now() } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const cutoff = now - windowMs;

  const filtered = records.filter((r) => r.createdAt >= cutoff);
  const buckets = groupByDispatchBucket(filtered);

  const results: DispatchPolicyStatsInput[] = [];

  for (const bucket of buckets.values()) {
    const { persona, taskKind, repoType, records: bucketRecords } = bucket;

    const sampleCount = bucketRecords.length;
    const insufficientData = sampleCount < insufficientDataThreshold;

    const costs = bucketRecords
      .map((r) => r.costUsd)
      .filter((v): v is number => v !== undefined && v >= 0);

    const executorStatuses = bucketRecords
      .map((r) => r.executorStatus)
      .filter((v): v is 'succeeded' | 'failed' => v !== undefined) as ('succeeded' | 'failed')[];
    const reviewerStatuses = bucketRecords
      .map((r) => r.reviewerStatus)
      .filter((v): v is 'passed' | 'failed' | 'needs-changes' => v !== undefined) as ('passed' | 'failed' | 'needs-changes')[];
    const recoveryActions = bucketRecords
      .map((r) => r.recoveryAction)
      .filter((v): v is 'retry' | 'escalate' | 'split' | 'replan' | 'human_review' => v !== undefined) as ('retry' | 'escalate' | 'split' | 'replan' | 'human_review')[];

    results.push({
      persona,
      taskKind,
      repoType,
      p50Cost: insufficientData ? 0 : percentile(costs, 50),
      p90Cost: insufficientData ? 0 : percentile(costs, 90),
      reviewFailRate: insufficientData ? 0 : rate(reviewerStatuses, 'failed'),
      retryRate: insufficientData ? 0 : rate(recoveryActions, 'retry'),
      sampleCount,
      windowDays,
      insufficientData,
      lastUpdatedAt: now,
    });
  }

  return results;
}

export interface HarnessReliabilityBucket {
  harnessName: string;
  records: RunContractRecord[];
}

/**
 * Group run contract records into harness reliability buckets by harness name
 * @param records - Array of run contract records to group
 * @returns Map of harness name to HarnessReliabilityBucket containing harnessName and records
 */
export function groupByHarness(records: RunContractRecord[]): Map<string, HarnessReliabilityBucket> {
  const buckets = new Map<string, HarnessReliabilityBucket>();

  for (const record of records) {
    const harnessName = record.harnessName ?? 'opencode';

    let bucket = buckets.get(harnessName);
    if (!bucket) {
      bucket = { harnessName, records: [] };
      buckets.set(harnessName, bucket);
    }
    bucket.records.push(record);
  }

  return buckets;
}

export interface ComputeHarnessReliabilityStatsOptions extends Partial<RollupOptions> {
  now?: number;
}

/**
 * Aggregate run contract records into harness reliability statistics grouped by harness name
 * @param records - Array of run contract records to aggregate
 * @param options - Optional configuration (windowDays, now)
 * @returns Array of HarnessReliabilityStatsInput objects with aggregated statistics
 */
export function computeHarnessReliabilityStats(
  records: RunContractRecord[],
  options: ComputeHarnessReliabilityStatsOptions = {},
): HarnessReliabilityStatsInput[] {
  const { windowDays = 7, now = Date.now() } = { ...DEFAULT_OPTIONS, ...options };

  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const cutoff = now - windowMs;

  const filtered = records.filter((r) => r.createdAt >= cutoff);
  const buckets = groupByHarness(filtered);

  const results: HarnessReliabilityStatsInput[] = [];

  for (const bucket of buckets.values()) {
    const { harnessName, records: bucketRecords } = bucket;

    const executorStatuses = bucketRecords
      .map((r) => r.executorStatus)
      .filter((v): v is 'succeeded' | 'failed' => v !== undefined) as ('succeeded' | 'failed')[];
    const successCount = executorStatuses.filter((s) => s === 'succeeded').length;
    const successRate7d = executorStatuses.length > 0 ? successCount / executorStatuses.length : 0;

    const reviewerStatuses = bucketRecords
      .map((r) => r.reviewerStatus)
      .filter((v): v is 'passed' | 'failed' | 'needs-changes' => v !== undefined) as ('passed' | 'failed' | 'needs-changes')[];
    const taskKinds = bucketRecords.map((r) => deriveTaskKind(r.taskId));
    const reviewPassRateByTaskClass: Record<string, number> = {};
    for (const kind of new Set(taskKinds)) {
      const relevantStatuses = bucketRecords
        .filter((r) => deriveTaskKind(r.taskId) === kind)
        .map((r) => r.reviewerStatus)
        .filter((v): v is 'passed' | 'failed' | 'needs-changes' => v !== undefined) as ('passed' | 'failed' | 'needs-changes')[];
      reviewPassRateByTaskClass[kind] =
        relevantStatuses.length > 0
          ? relevantStatuses.filter((s) => s === 'passed').length / relevantStatuses.length
          : 0;
    }

    const recoveryActions = bucketRecords
      .map((r) => r.recoveryAction)
      .filter((v): v is 'retry' | 'escalate' | 'split' | 'replan' | 'human_review' => v !== undefined) as ('retry' | 'escalate' | 'split' | 'replan' | 'human_review')[];
    const topFailureModes = [...new Set(recoveryActions)];

    results.push({
      harnessName,
      successRate7d,
      // TD-043: medianLatencyMs and averageTokens were fabricated from confidence scores.
      // Removed until real latency/token data is available from workRuns.
      medianLatencyMs: 0,
      averageTokens: 0,
      reviewPassRateByTaskClassJson: JSON.stringify(reviewPassRateByTaskClass),
      topFailureModesJson: JSON.stringify(topFailureModes),
      lastUpdatedAt: now,
    });
  }

  return results;
}

export interface DirtyBuckets {
  dispatchBuckets: Array<{ persona: string; taskKind: string; repoType: string }>;
  harnessNames: string[];
}

/**
 * Identify dispatch buckets and harnesses with records newer than last run timestamp
 * @param records - Array of run contract records to check
 * @param lastRunAt - Timestamp of last recompute run
 * @returns DirtyBuckets object with dispatchBuckets and harnessNames that have newer records
 */
export function identifyDirtyBuckets(
  records: RunContractRecord[],
  lastRunAt: number,
): DirtyBuckets {
  const dirtyDispatch = new Set<string>();
  const dirtyHarness = new Set<string>();

  for (const record of records) {
    if (record.createdAt > lastRunAt) {
      const persona = derivePersona(record);
      const taskKind = deriveTaskKind(record.taskId);
      const repoType = deriveRepoType(record.projectSlug);
      dirtyDispatch.add(`${persona}::${taskKind}::${repoType}`);
      dirtyHarness.add(record.harnessName ?? 'opencode');
    }
  }

  const dispatchBuckets = Array.from(dirtyDispatch).map((key) => {
    const [persona, taskKind, repoType] = key.split('::');
    return { persona, taskKind, repoType };
  });

  return {
    dispatchBuckets,
    harnessNames: Array.from(dirtyHarness),
  };
}
