import { describe, expect, it, mock } from 'bun:test';
import {
  getDefaultThreshold,
  deriveTrackType,
  checkCoverageThreshold,
  enforceCoverageThreshold,
  createCoverageBlockerIssue,
} from './coverageEnforcement';
import type { CoverageHooks } from './types';

describe('getDefaultThreshold', () => {
  it('returns 80 for feature', () => {
    expect(getDefaultThreshold('feature')).toBe(80);
  });

  it('returns 90 for bug', () => {
    expect(getDefaultThreshold('bug')).toBe(90);
  });

  it('returns 70 for chore', () => {
    expect(getDefaultThreshold('chore')).toBe(70);
  });

  it('returns 75 for unknown type', () => {
    expect(getDefaultThreshold('unknown')).toBe(75);
  });

  it('is case-insensitive', () => {
    expect(getDefaultThreshold('FEATURE')).toBe(80);
    expect(getDefaultThreshold('BUG')).toBe(90);
  });
});

describe('deriveTrackType', () => {
  it('returns bug for fix_ prefixed track IDs', () => {
    expect(deriveTrackType('fix_git_orchestrator_20260411')).toBe('bug');
  });

  it('returns bug for tracks containing bug', () => {
    expect(deriveTrackType('critical_bug_fix_20260404')).toBe('bug');
  });

  it('returns chore for chore tracks', () => {
    expect(deriveTrackType('chore_daily_cleanup_20260405')).toBe('chore');
  });

  it('returns chore for cleanup tracks', () => {
    expect(deriveTrackType('daily_cleanup_20260405')).toBe('chore');
  });

  it('returns feature for generic track IDs', () => {
    expect(deriveTrackType('test_coverage_dashboard_20260411')).toBe('feature');
  });
});

describe('checkCoverageThreshold', () => {
  it('passes when coverage meets threshold', () => {
    const result = checkCoverageThreshold(80, 'feature');
    expect(result.pass).toBe(true);
    expect(result.threshold).toBe(80);
  });

  it('fails when coverage is below threshold', () => {
    const result = checkCoverageThreshold(79, 'feature');
    expect(result.pass).toBe(false);
    expect(result.threshold).toBe(80);
  });

  it('uses custom threshold from hooks', () => {
    const hooks: CoverageHooks = { getThreshold: () => 95 };
    const result = checkCoverageThreshold(90, 'feature', hooks);
    expect(result.pass).toBe(false);
    expect(result.threshold).toBe(95);
  });

  it('passes exactly at threshold', () => {
    const result = checkCoverageThreshold(90, 'bug');
    expect(result.pass).toBe(true);
  });
});

describe('enforceCoverageThreshold', () => {
  const buildClient = () => ({
    mutation: mock(async () => {}),
    query: mock(async () => []),
  });

  it('returns violated=false when coverage is above threshold', async () => {
    const client = buildClient();
    const result = await enforceCoverageThreshold(
      client as any,
      'proj',
      'task-1',
      'Do something',
      'feature_track_20260411',
      85,
      75,
    );
    expect(result.violated).toBe(false);
    expect(client.mutation).not.toHaveBeenCalled();
  });

  it('returns violated=true and creates blocker when below threshold', async () => {
    const client = buildClient();
    const result = await enforceCoverageThreshold(
      client as any,
      'proj',
      'task-1',
      'Do something',
      'feature_track_20260411',
      60,
      82,
    );
    expect(result.violated).toBe(true);
    expect(result.trackType).toBe('feature');
    expect(result.threshold).toBe(80);
    expect(client.mutation).toHaveBeenCalled();
  });

  it('calls onViolation hook instead of creating blocker directly', async () => {
    const client = buildClient();
    const onViolation = mock(async () => {});
    const hooks: CoverageHooks = { onViolation };

    const result = await enforceCoverageThreshold(
      client as any,
      'proj',
      'task-1',
      'Do something',
      'feature_track_20260411',
      60,
      82,
      hooks,
    );

    expect(result.violated).toBe(true);
    expect(onViolation).toHaveBeenCalledTimes(1);
    const calls = onViolation.mock.calls as unknown as [unknown][];
    expect(calls[0][0]).toMatchObject({
      taskKey: 'task-1',
      trackType: 'feature',
      threshold: 80,
      actual: 60,
      before: 82,
    });
    expect(client.mutation).not.toHaveBeenCalled();
  });

  it('uses custom trackType from getTrackType hook', async () => {
    const client = buildClient();
    const hooks: CoverageHooks = {
      getTrackType: () => 'bug',
    };

    const result = await enforceCoverageThreshold(
      client as any,
      'proj',
      'task-1',
      'Fix something',
      'some_track_20260411',
      88,
      91,
      hooks,
    );

    expect(result.trackType).toBe('bug');
    expect(result.threshold).toBe(90);
    expect(result.violated).toBe(true);
  });
});

describe('createCoverageBlockerIssue', () => {
  it('calls upsertIssue mutation with correct data', async () => {
    const mutationArgs: any[] = [];
    const client = {
      mutation: mock(async (_fn: unknown, args: unknown) => {
        mutationArgs.push(args);
      }),
    };

    await createCoverageBlockerIssue(
      client as any,
      'my-project',
      'task-42',
      'Implement feature X',
      65.5,
      80,
      'feature',
      72.3,
    );

    expect(client.mutation).toHaveBeenCalledTimes(1);
    const args = mutationArgs[0];
    expect(args.projectSlug).toBe('my-project');
    expect(args.title).toContain('task-42');
    expect(args.title).toContain('65.5%');
    expect(args.body).toContain('80%');
    expect(args.body).toContain('72.3%');
    expect(args.status).toBe('open');
  });
});

// ── Integration test: task completes, coverage drops, blocker created ──

describe('runProject with coverage enforcement', () => {
  const buildMockClient = () => ({
    mutation: mock(async () => {}),
    query: mock(async () => [
      {
        projectSlug: 'test-project',
        trackId: 'feature_track_20260411',
        taskKey: 't1',
        title: 'Test task',
        status: 'todo',
        dependencies: [],
        updatedAt: Date.now(),
      },
    ]),
  });

  it('blocks task and returns failed when coverage drops below threshold', async () => {
    const { runProject } = await import('./orchestrator');
    const client = buildMockClient();
    const blockerHook = mock(async () => {});
    const delegationHook = mock(async () => 0);
    const violationHook = mock(async () => {});

    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'success',
      durationMs: 200,
      coveragePercentage: 60,
      coverageTool: 'vitest',
    }));

    const result = await runProject(
      client as any,
      'test-project',
      { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1, commandTimeoutMs: 1000 },
      { createBlocker: blockerHook, createDelegations: delegationHook },
      mockExecute,
      undefined,
      { onViolation: violationHook },
    );

    expect(result.status).toBe('failed');
    expect(result.error).toContain('below threshold');
    expect(violationHook).toHaveBeenCalledTimes(1);
  });

  it('succeeds normally when coverage is above threshold', async () => {
    const { runProject } = await import('./orchestrator');
    const client = buildMockClient();
    const blockerHook = mock(async () => {});
    const delegationHook = mock(async () => 0);
    const violationHook = mock(async () => {});

    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'success',
      durationMs: 200,
      coveragePercentage: 85,
      coverageTool: 'vitest',
    }));

    const result = await runProject(
      client as any,
      'test-project',
      undefined,
      { createBlocker: blockerHook, createDelegations: delegationHook },
      mockExecute,
      undefined,
      { onViolation: violationHook },
    );

    expect(result.status).toBe('succeeded');
    expect(violationHook).not.toHaveBeenCalled();
  });

  it('succeeds normally when no coverage data is present', async () => {
    const { runProject } = await import('./orchestrator');
    const client = buildMockClient();
    const blockerHook = mock(async () => {});
    const delegationHook = mock(async () => 0);

    const mockExecute: import('./types').ExecuteFn = mock(async () => ({
      taskKey: 't1',
      status: 'succeeded' as const,
      exitCode: 0,
      output: 'success',
      durationMs: 200,
    }));

    const result = await runProject(
      client as any,
      'test-project',
      undefined,
      { createBlocker: blockerHook, createDelegations: delegationHook },
      mockExecute,
    );

    expect(result.status).toBe('succeeded');
  });
});
