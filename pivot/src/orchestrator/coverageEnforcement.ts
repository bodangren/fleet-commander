import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import type { CoverageHooks, CoverageViolation } from './types';

const DEFAULT_THRESHOLDS: Record<string, number> = {
  feature: 80,
  bug: 90,
  chore: 70,
  default: 75,
};

export function getDefaultThreshold(trackType: string): number {
  return DEFAULT_THRESHOLDS[trackType.toLowerCase()] ?? DEFAULT_THRESHOLDS['default'];
}

export function deriveTrackType(trackId: string): string {
  const lower = trackId.toLowerCase();
  if (/^fix_/.test(lower) || /bug/.test(lower)) return 'bug';
  if (/chore/.test(lower) || /cleanup/.test(lower)) return 'chore';
  return 'feature';
}

export function checkCoverageThreshold(
  actual: number,
  trackType: string,
  hooks?: CoverageHooks,
): { pass: boolean; threshold: number } {
  const threshold = hooks?.getThreshold
    ? hooks.getThreshold(trackType)
    : getDefaultThreshold(trackType);
  return { pass: actual >= threshold, threshold };
}

export async function createCoverageBlockerIssue(
  client: ConvexHttpClient,
  projectSlug: string,
  taskKey: string,
  taskTitle: string,
  actual: number,
  threshold: number,
  trackType: string,
  before?: number,
): Promise<void> {
  const issueId = `coverage-blocker-${taskKey}-${Date.now()}`;
  const beforeStr = before !== undefined ? `${before.toFixed(1)}%` : 'unknown';
  const deltaStr =
    before !== undefined ? `${(actual - before).toFixed(1)}%` : 'N/A';

  const body = [
    `Coverage dropped below the ${trackType} threshold (${threshold}%).`,
    '',
    `**Before:** ${beforeStr}`,
    `**After:** ${actual.toFixed(1)}%`,
    `**Delta:** ${deltaStr}`,
    `**Required:** ${threshold}%`,
    '',
    `Task: ${taskTitle}`,
  ].join('\n');

  await client.mutation(api.fleetCatalog.upsertIssue, {
    projectSlug,
    issueId,
    title: `Coverage threshold violation: ${taskKey} (${actual.toFixed(1)}% < ${threshold}%)`,
    body,
    status: 'open',
    openedAt: Date.now(),
  });
}

export async function enforceCoverageThreshold(
  client: ConvexHttpClient,
  projectSlug: string,
  taskKey: string,
  taskTitle: string,
  trackId: string,
  actual: number,
  before: number | undefined,
  hooks?: CoverageHooks,
): Promise<{ violated: boolean; threshold: number; trackType: string }> {
  const trackType = hooks?.getTrackType
    ? hooks.getTrackType(trackId)
    : deriveTrackType(trackId);

  const { pass, threshold } = checkCoverageThreshold(actual, trackType, hooks);

  if (!pass) {
    console.warn(
      `Coverage threshold violation for task ${taskKey}: ${actual.toFixed(1)}% < ${threshold}% (${trackType}, before: ${before !== undefined ? before.toFixed(1) : 'unknown'}%)`,
    );

    const violation: CoverageViolation = {
      taskKey,
      trackId,
      trackType,
      threshold,
      actual,
      before,
    };

    if (hooks?.onViolation) {
      await hooks.onViolation(violation);
    } else {
      await createCoverageBlockerIssue(
        client,
        projectSlug,
        taskKey,
        taskTitle,
        actual,
        threshold,
        trackType,
        before,
      );
    }
  }

  return { violated: !pass, threshold, trackType };
}
