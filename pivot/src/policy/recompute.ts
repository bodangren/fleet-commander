import type { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import {
  identifyDirtyBuckets,
  computeDispatchPolicyStats,
  computeHarnessReliabilityStats,
  type RunContractRecord,
} from './rollup';
import {
  upsertDispatchPolicyStats,
  upsertHarnessReliabilityStats,
  type DispatchPolicyStatsInput,
  type HarnessReliabilityStatsInput,
} from './statsClient';

export interface RecomputeOptions {
  windowDays?: number;
  minSampleCount?: number;
  insufficientDataThreshold?: number;
  now?: number;
}

const DEFAULT_RECOMPUTE_OPTIONS: Required<Omit<RecomputeOptions, 'now'>> & {
  now: number | undefined;
} = {
  windowDays: 7,
  minSampleCount: 5,
  insufficientDataThreshold: 10,
  now: undefined,
};

export interface RecomputeResult {
  recomputed: boolean;
  dispatchBuckets: number;
  harnessNames: number;
  reason?: string;
}

/**
 * Fetch window records
 * @param client - ConvexHttpClient instance
 * @param windowDays - Number of days to look back
 * @param now - Current timestamp
 * @returns Array of RunContractRecord objects within the time window
 */
async function fetchWindowRecords(
  client: ConvexHttpClient,
  windowDays: number,
  now: number,
): Promise<RunContractRecord[]> {
  const cutoff = now - windowDays * 24 * 60 * 60 * 1000;
  const docs = await client.query(api.runContracts.listRunContractsSince, {
    since: cutoff,
    limit: 10000,
  });
  return docs.map((doc) => ({
    taskId: doc.taskId,
    projectSlug: doc.projectSlug,
    createdAt: doc.createdAt,
    architectOutput: doc.architectOutput,
    architectConfidence: doc.architectConfidence,
    architectAssumptions: doc.architectAssumptions,
    executorChangedFiles: doc.executorChangedFiles,
    executorTestsRun: doc.executorTestsRun,
    executorUnresolvedAssumptions: doc.executorUnresolvedAssumptions,
    executorConfidence: doc.executorConfidence,
    executorBranch: doc.executorBranch,
    executorCommit: doc.executorCommit,
    executorStatus: doc.executorStatus,
    reviewerStatus: doc.reviewerStatus,
    reviewerSummary: doc.reviewerSummary,
    reviewerIssueClass: doc.reviewerIssueClass,
    reviewerSeverity: doc.reviewerSeverity,
    recoveryAction: doc.recoveryAction,
    recoveryReason: doc.recoveryReason,
    dispatchRejections: doc.dispatchRejections,
  }));
}

/**
 * Reads last policy recompute timestamp
 * @param client - ConvexHttpClient instance
 * @returns Timestamp of last recompute run, or 0 if never run
 */
async function readLastRunAt(client: ConvexHttpClient): Promise<number> {
  try {
    const setting = await client.query(api.fleetCatalog.getSetting, {
      scope: 'policyStats',
      key: 'lastRunAt',
    });
    if (setting && typeof (setting as any).valueJson === 'string') {
      const parsed = JSON.parse((setting as any).valueJson);
      if (typeof parsed === 'number') {
        return parsed;
      }
    }
  } catch {
    // ignore errors, default to 0
  }
  return 0;
}

/**
 * Writes last policy recompute timestamp
 * @param client - ConvexHttpClient instance
 * @param value - Timestamp to store as last run time
 */
async function writeLastRunAt(
  client: ConvexHttpClient,
  value: number,
): Promise<void> {
  await client.mutation(api.fleetCatalog.setSetting, {
    scope: 'policyStats',
    key: 'lastRunAt',
    valueJson: JSON.stringify(value),
  });
}

/**
 * Recomputes dispatch and harness policy statistics
 * @param client - ConvexHttpClient instance
 * @param options - Optional configuration (windowDays, minSampleCount, insufficientDataThreshold, now)
 * @returns Result object with recomputed flag, bucket counts, and reason if no recomputation occurred
 */
export async function recomputePolicyStats(
  client: ConvexHttpClient,
  options: RecomputeOptions = {},
): Promise<RecomputeResult> {
  const opts = { ...DEFAULT_RECOMPUTE_OPTIONS, ...options };
  const now = opts.now ?? Date.now();

  const records = await fetchWindowRecords(client, opts.windowDays, now);
  const lastRunAt = await readLastRunAt(client);

  const dirty = identifyDirtyBuckets(records, lastRunAt);

  if (dirty.dispatchBuckets.length === 0 && dirty.harnessNames.length === 0) {
    return {
      recomputed: false,
      dispatchBuckets: 0,
      harnessNames: 0,
      reason: 'no_dirty_buckets',
    };
  }

  const dispatchStats = computeDispatchPolicyStats(records, {
    windowDays: opts.windowDays,
    minSampleCount: opts.minSampleCount,
    insufficientDataThreshold: opts.insufficientDataThreshold,
    now,
  });

  const harnessStats = computeHarnessReliabilityStats(records, {
    windowDays: opts.windowDays,
    now,
  });

  for (const stat of dispatchStats) {
    await upsertDispatchPolicyStats(client, stat);
  }

  for (const stat of harnessStats) {
    await upsertHarnessReliabilityStats(client, stat);
  }

  await writeLastRunAt(client, now);

  return {
    recomputed: true,
    dispatchBuckets: dispatchStats.length,
    harnessNames: harnessStats.length,
  };
}
