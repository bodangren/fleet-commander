import { describe, expect, it } from 'bun:test';
import {
  deriveTaskKind,
  deriveRepoType,
  derivePersona,
  groupByDispatchBucket,
  computeDispatchPolicyStats,
  groupByHarness,
  computeHarnessReliabilityStats,
  identifyDirtyBuckets,
} from './rollup';
import type { RunContractRecord } from './rollup';

/**
 * Creates new instance
 * @param overrides - Partial RunContractRecord to override defaults
 * @returns RunContractRecord with test defaults
 */
function makeRecord(overrides: Partial<RunContractRecord> = {}): RunContractRecord {
  return {
    taskId: 'task-123',
    projectSlug: 'test-project',
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('deriveTaskKind', () => {
  it('returns "bug" for taskId containing bug/fix', () => {
    expect(deriveTaskKind('task-bug-123')).toBe('bug');
    expect(deriveTaskKind('fix-auth-task')).toBe('bug');
    expect(deriveTaskKind('BUG-123')).toBe('bug');
  });

  it('returns "chore" for taskId containing chore/cleanup/maintenance', () => {
    expect(deriveTaskKind('task-chore-123')).toBe('chore');
    expect(deriveTaskKind('cleanup-code')).toBe('chore');
    expect(deriveTaskKind('maintenance-task')).toBe('chore');
  });

  it('returns "review" for taskId containing review', () => {
    expect(deriveTaskKind('task-review-123')).toBe('review');
  });

  it('returns "feature" for other taskIds', () => {
    expect(deriveTaskKind('task-123')).toBe('feature');
    expect(deriveTaskKind('feature-add-login')).toBe('feature');
  });
});

describe('deriveRepoType', () => {
  it('returns "monorepo" for projectSlug containing mono', () => {
    expect(deriveRepoType('my-monorepo')).toBe('monorepo');
    expect(deriveRepoType('mono-repo')).toBe('monorepo');
  });

  it('returns "multirepo" for projectSlug containing multi/poly', () => {
    expect(deriveRepoType('my-multirepo')).toBe('multirepo');
    expect(deriveRepoType('polyrepo')).toBe('multirepo');
  });

  it('returns "default" for other projectSlugs', () => {
    expect(deriveRepoType('my-project')).toBe('default');
  });
});

describe('derivePersona', () => {
  it('returns "recovery" when recoveryAction is present', () => {
    const record = makeRecord({ recoveryAction: 'retry' });
    expect(derivePersona(record)).toBe('recovery');
  });

  it('returns "reviewer" when reviewerStatus is present', () => {
    const record = makeRecord({ reviewerStatus: 'passed' });
    expect(derivePersona(record)).toBe('reviewer');
  });

  it('returns "executor" when executorStatus is present', () => {
    const record = makeRecord({ executorStatus: 'succeeded' });
    expect(derivePersona(record)).toBe('executor');
  });

  it('returns "architect" when architectOutput is present', () => {
    const record = makeRecord({ architectOutput: 'design output' });
    expect(derivePersona(record)).toBe('architect');
  });

  it('defaults to "executor" when no stage output is present', () => {
    const record = makeRecord();
    expect(derivePersona(record)).toBe('executor');
  });
});

describe('groupByDispatchBucket', () => {
  it('groups records by persona::taskKind::repoType', () => {
    const records = [
      makeRecord({ taskId: 'task-feature-1', projectSlug: 'mono-repo', executorStatus: 'succeeded' }),
      makeRecord({ taskId: 'task-feature-2', projectSlug: 'mono-repo', executorStatus: 'succeeded' }),
      makeRecord({ taskId: 'task-bug-1', projectSlug: 'mono-repo', executorStatus: 'succeeded' }),
      makeRecord({ taskId: 'task-feature-1', projectSlug: 'my-project', executorStatus: 'succeeded' }),
    ];

    const buckets = groupByDispatchBucket(records);

    expect(buckets.size).toBe(3);
    expect(buckets.get('executor::feature::monorepo')?.records.length).toBe(2);
    expect(buckets.get('executor::bug::monorepo')?.records.length).toBe(1);
    expect(buckets.get('executor::feature::default')?.records.length).toBe(1);
  });

  it('handles empty array', () => {
    const buckets = groupByDispatchBucket([]);
    expect(buckets.size).toBe(0);
  });
});

describe('computeDispatchPolicyStats', () => {
  const now = Date.now();

  it('computes stats for a bucket with sufficient data', () => {
    const records: RunContractRecord[] = [
      makeRecord({
        taskId: 'task-feature-1',
        projectSlug: 'mono-repo',
        executorStatus: 'succeeded',
        executorConfidence: 0.9,
        architectConfidence: 0.8,
        createdAt: now - 1000,
      }),
      makeRecord({
        taskId: 'task-feature-2',
        projectSlug: 'mono-repo',
        executorStatus: 'succeeded',
        executorConfidence: 0.7,
        architectConfidence: 0.6,
        createdAt: now - 2000,
      }),
    ];

    const stats = computeDispatchPolicyStats(records, { now, insufficientDataThreshold: 2 });

    expect(stats.length).toBe(1);
    const result = stats[0];
    expect(result.persona).toBe('executor');
    expect(result.taskKind).toBe('feature');
    expect(result.repoType).toBe('monorepo');
    expect(result.sampleCount).toBe(2);
    expect(result.windowDays).toBe(7);
    expect(result.insufficientData).toBe(false);
  });

  it('marks stats as insufficient when sample count is below threshold', () => {
    const records: RunContractRecord[] = [
      makeRecord({
        taskId: 'task-feature-1',
        projectSlug: 'mono-repo',
        executorStatus: 'succeeded',
        createdAt: now - 1000,
      }),
    ];

    const stats = computeDispatchPolicyStats(records, { now, insufficientDataThreshold: 5 });

    expect(stats.length).toBe(1);
    const result = stats[0];
    expect(result.insufficientData).toBe(true);
    expect(result.reviewFailRate).toBe(0);
    expect(result.retryRate).toBe(0);
  });

  it('filters out records outside the window', () => {
    const oldTime = now - 10 * 24 * 60 * 60 * 1000;
    const recentTime = now - 1000;

    const records: RunContractRecord[] = [
      makeRecord({
        taskId: 'task-feature-old',
        projectSlug: 'mono-repo',
        executorStatus: 'succeeded',
        createdAt: oldTime,
      }),
      makeRecord({
        taskId: 'task-feature-new',
        projectSlug: 'mono-repo',
        executorStatus: 'succeeded',
        createdAt: recentTime,
      }),
    ];

    const stats = computeDispatchPolicyStats(records, { now, windowDays: 7 });

    expect(stats.length).toBe(1);
    expect(stats[0].sampleCount).toBe(1);
  });

  it('handles empty records array', () => {
    const stats = computeDispatchPolicyStats([], { now });
    expect(stats.length).toBe(0);
  });

  it('computes p50 and p90 cost percentiles', () => {
    const records: RunContractRecord[] = [
      makeRecord({
        taskId: 'task-feature-1',
        projectSlug: 'mono-repo',
        executorStatus: 'succeeded',
        architectConfidence: 0.5,
        createdAt: now - 1000,
      }),
      makeRecord({
        taskId: 'task-feature-2',
        projectSlug: 'mono-repo',
        executorStatus: 'succeeded',
        architectConfidence: 0.7,
        createdAt: now - 2000,
      }),
      makeRecord({
        taskId: 'task-feature-3',
        projectSlug: 'mono-repo',
        executorStatus: 'succeeded',
        architectConfidence: 0.9,
        createdAt: now - 3000,
      }),
    ];

    const stats = computeDispatchPolicyStats(records, { now, insufficientDataThreshold: 1 });

    expect(stats.length).toBe(1);
    expect(stats[0].p50Cost).toBe(0.7);
    expect(stats[0].p90Cost).toBe(0.9);
  });
});

describe('groupByHarness', () => {
  it('groups records by harness name', () => {
    const records = [
      makeRecord({ taskId: 'task-1' }),
      makeRecord({ taskId: 'task-2' }),
    ];

    const buckets = groupByHarness(records);

    expect(buckets.size).toBe(1);
    expect(buckets.get('opencode')?.records.length).toBe(2);
  });

  it('groups records by multiple harness names', () => {
    const records = [
      makeRecord({ taskId: 'task-1', harnessName: 'opencode' }),
      makeRecord({ taskId: 'task-2', harnessName: 'opencode' }),
      makeRecord({ taskId: 'task-3', harnessName: 'cursor' }),
      makeRecord({ taskId: 'task-4', harnessName: 'copilot' }),
    ];

    const buckets = groupByHarness(records);

    expect(buckets.size).toBe(3);
    expect(buckets.get('opencode')?.records.length).toBe(2);
    expect(buckets.get('cursor')?.records.length).toBe(1);
    expect(buckets.get('copilot')?.records.length).toBe(1);
  });

  it('defaults to opencode when harnessName is undefined', () => {
    const records = [
      makeRecord({ taskId: 'task-1', harnessName: undefined }),
      makeRecord({ taskId: 'task-2' }),
    ];

    const buckets = groupByHarness(records);

    expect(buckets.size).toBe(1);
    expect(buckets.get('opencode')?.records.length).toBe(2);
  });

  it('handles empty array', () => {
    const buckets = groupByHarness([]);
    expect(buckets.size).toBe(0);
  });
});

describe('computeHarnessReliabilityStats', () => {
  const now = Date.now();

  it('computes success rate from executor statuses', () => {
    const records: RunContractRecord[] = [
      makeRecord({ executorStatus: 'succeeded', taskId: 'task-feature-1', createdAt: now - 1000 }),
      makeRecord({ executorStatus: 'succeeded', taskId: 'task-feature-2', createdAt: now - 2000 }),
      makeRecord({ executorStatus: 'failed', taskId: 'task-bug-1', createdAt: now - 3000 }),
    ];

    const stats = computeHarnessReliabilityStats(records, { now });

    expect(stats.length).toBe(1);
    expect(stats[0].successRate7d).toBeCloseTo(2 / 3, 2);
    expect(stats[0].harnessName).toBe('opencode');
  });

  it('computes review pass rate by task class', () => {
    const records: RunContractRecord[] = [
      makeRecord({
        executorStatus: 'succeeded',
        reviewerStatus: 'passed',
        taskId: 'task-feature-1',
        createdAt: now - 1000,
      }),
      makeRecord({
        executorStatus: 'succeeded',
        reviewerStatus: 'failed',
        taskId: 'task-feature-2',
        createdAt: now - 2000,
      }),
      makeRecord({
        executorStatus: 'succeeded',
        reviewerStatus: 'passed',
        taskId: 'task-bug-1',
        createdAt: now - 3000,
      }),
    ];

    const stats = computeHarnessReliabilityStats(records, { now });

    const passRates = JSON.parse(stats[0].reviewPassRateByTaskClassJson);
    expect(passRates.feature).toBeCloseTo(0.5, 2);
    expect(passRates.bug).toBe(1);
  });

  it('sets medianLatencyMs and averageTokens to 0 (TD-043: fabricated metrics removed)', () => {
    const records: RunContractRecord[] = [
      makeRecord({ executorStatus: 'succeeded', executorConfidence: 0.5, taskId: 'task-feature-1', createdAt: now - 1000 }),
      makeRecord({ executorStatus: 'succeeded', executorConfidence: 0.7, taskId: 'task-feature-2', createdAt: now - 2000 }),
      makeRecord({ executorStatus: 'succeeded', executorConfidence: 0.9, taskId: 'task-feature-3', createdAt: now - 3000 }),
    ];

    const stats = computeHarnessReliabilityStats(records, { now });

    expect(stats[0].medianLatencyMs).toBe(0);
    expect(stats[0].averageTokens).toBe(0);
  });

  it('identifies top failure modes from recovery actions', () => {
    const records: RunContractRecord[] = [
      makeRecord({ recoveryAction: 'retry', taskId: 'task-feature-1', createdAt: now - 1000 }),
      makeRecord({ recoveryAction: 'retry', taskId: 'task-feature-2', createdAt: now - 2000 }),
      makeRecord({ recoveryAction: 'escalate', taskId: 'task-bug-1', createdAt: now - 3000 }),
    ];

    const stats = computeHarnessReliabilityStats(records, { now });

    const failureModes = JSON.parse(stats[0].topFailureModesJson);
    expect(failureModes).toContain('retry');
    expect(failureModes).toContain('escalate');
  });

  it('handles empty records array', () => {
    const stats = computeHarnessReliabilityStats([], { now });
    expect(stats.length).toBe(0);
  });

  it('filters records outside the window', () => {
    const oldTime = now - 10 * 24 * 60 * 60 * 1000;
    const recentTime = now - 1000;

    const records: RunContractRecord[] = [
      makeRecord({ executorStatus: 'succeeded', taskId: 'task-feature-old', createdAt: oldTime }),
      makeRecord({ executorStatus: 'succeeded', taskId: 'task-feature-new', createdAt: recentTime }),
    ];

    const stats = computeHarnessReliabilityStats(records, { now, windowDays: 7 });

    expect(stats[0].successRate7d).toBe(1);
  });
});

describe('identifyDirtyBuckets', () => {
  const now = Date.now();

  it('returns empty arrays when no records are newer than lastRunAt', () => {
    const records: RunContractRecord[] = [
      makeRecord({ createdAt: now - 2000 }),
      makeRecord({ createdAt: now - 1000 }),
    ];

    const dirty = identifyDirtyBuckets(records, now);

    expect(dirty.dispatchBuckets).toEqual([]);
    expect(dirty.harnessNames).toEqual([]);
  });

  it('identifies dirty dispatch buckets for new records', () => {
    const records: RunContractRecord[] = [
      makeRecord({
        taskId: 'task-feature-1',
        projectSlug: 'mono-repo',
        executorStatus: 'succeeded',
        createdAt: now - 1000,
      }),
      makeRecord({
        taskId: 'task-bug-1',
        projectSlug: 'my-project',
        executorStatus: 'succeeded',
        createdAt: now + 1000,
      }),
    ];

    const dirty = identifyDirtyBuckets(records, now);

    expect(dirty.dispatchBuckets).toEqual([
      { persona: 'executor', taskKind: 'bug', repoType: 'default' },
    ]);
  });

  it('identifies dirty harness names for new records', () => {
    const records: RunContractRecord[] = [
      makeRecord({ createdAt: now - 1000 }),
      makeRecord({ createdAt: now + 1000 }),
    ];

    const dirty = identifyDirtyBuckets(records, now);

    expect(dirty.harnessNames).toEqual(['opencode']);
  });

  it('identifies multiple dirty harness names', () => {
    const records: RunContractRecord[] = [
      makeRecord({ createdAt: now + 1000, harnessName: 'opencode' }),
      makeRecord({ createdAt: now + 2000, harnessName: 'cursor' }),
      makeRecord({ createdAt: now + 3000, harnessName: 'copilot' }),
    ];

    const dirty = identifyDirtyBuckets(records, now);

    expect(dirty.harnessNames).toContain('opencode');
    expect(dirty.harnessNames).toContain('cursor');
    expect(dirty.harnessNames).toContain('copilot');
    expect(dirty.harnessNames.length).toBe(3);
  });

  it('deduplicates dirty harness names', () => {
    const records: RunContractRecord[] = [
      makeRecord({ createdAt: now + 1000, harnessName: 'opencode' }),
      makeRecord({ createdAt: now + 2000, harnessName: 'opencode' }),
    ];

    const dirty = identifyDirtyBuckets(records, now);

    expect(dirty.harnessNames).toEqual(['opencode']);
  });

  it('deduplicates dirty buckets across multiple records', () => {
    const records: RunContractRecord[] = [
      makeRecord({
        taskId: 'task-feature-1',
        projectSlug: 'mono-repo',
        createdAt: now + 1000,
      }),
      makeRecord({
        taskId: 'task-feature-2',
        projectSlug: 'mono-repo',
        createdAt: now + 2000,
      }),
      makeRecord({
        taskId: 'task-bug-1',
        projectSlug: 'mono-repo',
        createdAt: now + 3000,
      }),
    ];

    const dirty = identifyDirtyBuckets(records, now);

    expect(dirty.dispatchBuckets.length).toBe(2);
    expect(dirty.dispatchBuckets).toContainEqual({ persona: 'executor', taskKind: 'feature', repoType: 'monorepo' });
    expect(dirty.dispatchBuckets).toContainEqual({ persona: 'executor', taskKind: 'bug', repoType: 'monorepo' });
    expect(dirty.harnessNames).toEqual(['opencode']);
  });

  it('handles empty records array', () => {
    const dirty = identifyDirtyBuckets([], now);

    expect(dirty.dispatchBuckets).toEqual([]);
    expect(dirty.harnessNames).toEqual([]);
  });
});
