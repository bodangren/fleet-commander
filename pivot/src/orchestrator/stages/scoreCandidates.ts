import { ConvexHttpClient } from 'convex/browser';
import { StalenessCache } from '../../failover/policyCache';
import {
  listDispatchPolicyStats,
  listHarnessReliabilityStats,
} from '../../policy/statsClient';
import { selectBestCandidate } from '../../policy/dispatch';
import { getBestTask } from '../evaluator';
import { loadDispatchOptions } from '../../policy/weightPresets';
import { logAndCaptureError } from '../logger';
import type { Task } from '../types';

type PolicyStats = Awaited<ReturnType<typeof listDispatchPolicyStats>>;
type HarnessStats = Awaited<ReturnType<typeof listHarnessReliabilityStats>>;
type Selected = Awaited<ReturnType<typeof selectBestCandidate>>;

interface PolicyStatsCacheEntry {
  policyStats: PolicyStats;
  harnessStats: HarnessStats;
}

/**
 * Cache shared across calls. Module-level so the same cache is reused by
 * runProject regardless of how many calls are in flight.
 */
const policyStatsCache = new StalenessCache<PolicyStatsCacheEntry>();

/**
 * Loads (or returns cached) policy and harness reliability stats from Convex.
 */
export async function loadPolicyAndHarnessStats(
  client: ConvexHttpClient,
): Promise<{ policyStats: PolicyStats; harnessStats: HarnessStats } | null> {
  const cached = policyStatsCache.get();
  if (cached && !cached.stale) {
    return { policyStats: cached.data.policyStats, harnessStats: cached.data.harnessStats };
  }
  try {
    const [policyStats, harnessStats] = await Promise.all([
      listDispatchPolicyStats(client, 1000),
      listHarnessReliabilityStats(client, 100),
    ]);
    policyStatsCache.set({ policyStats, harnessStats });
    return { policyStats, harnessStats };
  } catch {
    return null;
  }
}

/**
 * Reads the (possibly stale) policy and harness stats cache.
 */
export function readStaleStats(): {
  policyStats: PolicyStats;
  harnessStats: HarnessStats;
} | null {
  const stale = policyStatsCache.get();
  return stale ? { policyStats: stale.data.policyStats, harnessStats: stale.data.harnessStats } : null;
}

/**
 * Wraps selectBestCandidate with a stale-cache fallback and finally a legacy
 * evaluator fallback. Returns null when nothing is selected.
 */
export async function scoreCandidates(
  client: ConvexHttpClient,
  projectSlug: string,
  eligibleTasks: Task[],
  trackStatuses: Map<string, string>,
): Promise<Selected | null> {
  try {
    const stats = await loadPolicyAndHarnessStats(client);
    if (stats) {
      return await selectBestCandidate(
        eligibleTasks,
        { name: 'opencode' },
        stats.policyStats,
        stats.harnessStats,
        loadDispatchOptions(projectSlug),
      );
    }
  } catch (err) {
    const stale = readStaleStats();
    if (stale) {
      try {
        console.warn('[failover] Using stale policy cache (Convex unreachable)');
        return await selectBestCandidate(
          eligibleTasks,
          { name: 'opencode' },
          stale.policyStats,
          stale.harnessStats,
          loadDispatchOptions(projectSlug),
        );
      } catch {
        // fall through
      }
    }
    await logAndCaptureError(
      client,
      'warning',
      'Adaptive scoring failed, falling back to legacy evaluator',
      { projectSlug, operation: 'selectBestCandidate' },
      err,
    );
  }

  // Legacy fallback
  const fallback = getBestTask(eligibleTasks, trackStatuses);
  if (!fallback) return null;
  return {
    task: fallback.task,
    trackId: fallback.trackId,
    score: fallback.score,
    breakdown: {},
    justification: fallback.rationale,
    llmTieBreak: false,
  };
}

/**
 * Test-only helper: clears the shared cache so tests can run in isolation.
 */
export function _resetPolicyStatsCacheForTests(): void {
  policyStatsCache.clear();
}
