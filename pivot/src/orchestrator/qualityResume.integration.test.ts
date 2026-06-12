/**
 * Phase S3 Red tests for the quality-run resume integration.
 *
 * The S3 phase "Persist And Recover Quality Runs" must add a resume
 * path that, on process restart, picks up an in-progress quality run
 * and continues from the first incomplete required stage. The S3 plan
 * requires this path to be implemented as either an extension of
 * `PipelineRunLifecycle` or a focused sibling that the lifecycle
 * delegates to. The integration test pins the following contract:
 *
 *   1. On a fresh dispatch, `planQualityRunResume` returns the full
 *      stage list from the immutable profile snapshot.
 *   2. After two required stages have passed, the resume plan omits
 *      those stages and returns only the first incomplete required
 *      stage and everything after it.
 *   3. Optional stages that were skipped are NOT replayed on resume
 *      (their `status='skipped'` log entry is final).
 *   4. The immutable profile snapshot is preserved across resume:
 *      even after the source profile is republished, the resumed
 *      run continues against the original (run-time) profile version.
 *   5. The real `PipelineRunLifecycle` class is used end-to-end (no
 *      fake or test-only lifecycle).
 *
 * The module under test does not exist yet. These tests are
 * intentionally Red and are committed under the `*.red.test.ts`
 * suffix per the S3 test-strategy §7 "Intentionally-red tests &
 * exclusion" rule.
 *
 * Owned by Phase S3 Test task 3; the `[~]` marker in `plan.md`
 * references this file. The Green sibling lands when
 * `pivot/src/orchestrator/qualityRunResume.ts` is implemented and
 * these tests pass.
 */

import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { PipelineRunLifecycle } from './stages/pipelineRunLifecycle';
import {
  planQualityRunResume,
  resumeQualityRun,
  type ResumePlan,
} from './qualityRunResume';

const walAdapter = {
  append: mock((_entry: { type: 'mutation'; target: string; args: Record<string, unknown> }) => ({
    id: 'wal-1',
    commit: () => {},
  })),
  commit: mock((_id: string) => {}),
};

const NOW = 1_700_000_000_000;

interface MutableClient {
  mutation: ReturnType<typeof mock>;
  query: ReturnType<typeof mock>;
}

function makeClient(): MutableClient {
  return {
    mutation: mock(async (_fn: unknown, _args: unknown) => ({})),
    query: mock(async (_fn: unknown, _args: unknown) => null),
  };
}

const standardProfile = {
  name: 'standard',
  version: 1,
  kind: 'standard' as const,
  description: 'standard profile v1',
  stages: [
    {
      kind: 'strategy' as const,
      policy: {
        required: true,
        applicability: { trackIsSetup: true },
        role: 'architect' as const,
        attempts: 1,
        timeoutMs: 300_000,
      },
    },
    {
      kind: 'red' as const,
      policy: {
        required: true,
        applicability: { always: true },
        role: 'executor' as const,
        attempts: 1,
        timeoutMs: 600_000,
      },
    },
    {
      kind: 'green' as const,
      policy: {
        required: true,
        applicability: { always: true },
        role: 'executor' as const,
        attempts: 1,
        timeoutMs: 600_000,
      },
    },
    {
      kind: 'phase_acceptance' as const,
      policy: {
        required: true,
        applicability: { always: true },
        role: 'reviewer' as const,
        attempts: 2,
        timeoutMs: 600_000,
      },
    },
  ],
};

describe('planQualityRunResume', () => {
  let client: MutableClient;

  beforeEach(() => {
    client = makeClient();
    walAdapter.append.mockClear();
    walAdapter.commit.mockClear();
  });

  it('returns every profile stage when no attempts have been recorded (fresh run)', async () => {
    client.query.mockImplementation(async () => ({
      runId: 'run-1',
      profileName: 'standard',
      profileVersion: 1,
      passedRequiredStageKinds: [],
      skippedOptionalStageKinds: [],
    }));

    const plan: ResumePlan = await planQualityRunResume(
      client as never,
      'demo',
      'run-1',
    );

    expect(plan.profileName).toBe('standard');
    expect(plan.profileVersion).toBe(1);
    expect(plan.stagesToRun.map((s) => s.kind)).toEqual([
      'strategy',
      'red',
      'green',
      'phase_acceptance',
    ]);
  });

  it('omits already-passed required stages and returns only the first incomplete + everything after', async () => {
    client.query.mockImplementation(async () => ({
      runId: 'run-1',
      profileName: 'standard',
      profileVersion: 1,
      passedRequiredStageKinds: ['strategy', 'red'],
      skippedOptionalStageKinds: [],
    }));

    const plan = await planQualityRunResume(client as never, 'demo', 'run-1');

    expect(plan.stagesToRun.map((s) => s.kind)).toEqual(['green', 'phase_acceptance']);
  });

  it('does NOT replay optional stages that were skipped (skip is terminal)', async () => {
    client.query.mockImplementation(async () => ({
      runId: 'run-1',
      profileName: 'standard',
      profileVersion: 1,
      passedRequiredStageKinds: ['red'],
      skippedOptionalStageKinds: ['strategy'],
    }));

    const plan = await planQualityRunResume(client as never, 'demo', 'run-1');

    const kinds = plan.stagesToRun.map((s) => s.kind);
    expect(kinds).toContain('green');
    expect(kinds).toContain('phase_acceptance');
    expect(kinds).not.toContain('strategy');
  });

  it('preserves the immutable profile snapshot even after the source profile is republished as v2', async () => {
    // The resume plan reads the run-time profile version, not the latest
    // published version. The Convex query returns the snapshot-bound
    // version (v1) even though the run-time store now has v2.
    client.query.mockImplementation(async () => ({
      runId: 'run-1',
      profileName: 'standard',
      profileVersion: 1,
      passedRequiredStageKinds: ['red'],
      skippedOptionalStageKinds: [],
    }));

    const plan = await planQualityRunResume(client as never, 'demo', 'run-1');

    expect(plan.profileVersion).toBe(1);
    expect(plan.profileName).toBe('standard');
  });
});

describe('resumeQualityRun — end-to-end via real PipelineRunLifecycle', () => {
  let client: MutableClient;

  beforeEach(() => {
    client = makeClient();
    walAdapter.append.mockClear();
    walAdapter.commit.mockClear();
  });

  it('uses the real PipelineRunLifecycle to append a "resumed" execution log entry', async () => {
    client.query.mockImplementation(async () => ({
      runId: 'run-1',
      profileName: 'standard',
      profileVersion: 1,
      passedRequiredStageKinds: ['red', 'green'],
      skippedOptionalStageKinds: [],
    }));

    const lifecycle = new PipelineRunLifecycle(client as never, 'demo', 'run-1', walAdapter);
    await resumeQualityRun(client as never, lifecycle, 'demo', 'run-1');

    // The resume should thread the lifecycle's projectSlug and runId into
    // at least one appendLog call (proves it uses the real lifecycle).
    const appendLogCalls = client.mutation.mock.calls.filter((call) => {
      const args = (call as unknown[])[1] as Record<string, unknown> | undefined;
      return typeof args?.summary === 'string' && /resume|resumed/i.test(args.summary);
    });
    expect(appendLogCalls.length).toBeGreaterThanOrEqual(1);
    for (const call of appendLogCalls) {
      const args = (call as unknown[])[1] as Record<string, unknown>;
      expect(args.projectSlug).toBe('demo');
      expect(args.runId).toBe('run-1');
    }
  });

  it('returns a resume plan whose stagesToRun starts at the first incomplete required stage', async () => {
    client.query.mockImplementation(async () => ({
      runId: 'run-1',
      profileName: 'standard',
      profileVersion: 1,
      passedRequiredStageKinds: ['strategy', 'red'],
      skippedOptionalStageKinds: [],
    }));

    const lifecycle = new PipelineRunLifecycle(client as never, 'demo', 'run-1', walAdapter);
    const plan = await resumeQualityRun(client as never, lifecycle, 'demo', 'run-1');

    expect(plan.stagesToRun[0].kind).toBe('green');
  });
});
