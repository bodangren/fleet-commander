/**
 * Phase S3 Red tests for `convex/qualityRuns.ts`.
 *
 * These tests pin the Convex mutation/query contract for the S3 phase
 * "Persist And Recover Quality Runs" of the measure-quality-workflow
 * integration track. They exercise:
 *
 *   1. Idempotent `startQualityRun` — same idempotencyKey + project +
 *      taskKey returns the existing run row (no duplicate insert).
 *   2. `appendStageAttempt` — records a stage attempt with role, attempt
 *      number, status, timestamps, structured result, gate evidence,
 *      cost, tokens, and model.
 *   3. `finishQualityRun` — terminal transitions (passed / failed /
 *      blocked / cancelled) with finishedAt timestamp.
 *   4. `markStageSkipped` — skipped stages carry a reason; attempts=0.
 *   5. `retryStageAttempt` — same stage + new attempt number; the
 *      prior attempt's record is retained (append-only).
 *   6. `getResumableQualityRun` — returns the in-progress run with
 *      already-passed required stages so dispatch can skip them.
 *   7. Terminal transitions from in-progress to blocked/failed are
 *      one-way; the run is no longer resumable after the terminal
 *      state is committed.
 *
 * The module under test does not exist yet. These tests are
 * intentionally Red and are committed under the `*.red.test.ts` suffix
 * per the S3 test-strategy §7 "Intentionally-red tests & exclusion"
 * rule.
 *
 * Owned by Phase S3 Test task 1; the `[~]` marker in `plan.md`
 * references this file. The Green sibling lands when
 * `convex/qualityRuns.ts` is implemented and these tests pass.
 */

import { describe, expect, it } from 'bun:test';
import { createMockCtx } from './__fixtures__/foundation';
import * as qualityRunsModule from './qualityRuns';
import {
  startQualityRunHandler,
  appendStageAttemptHandler,
  finishQualityRunHandler,
  markStageSkippedHandler,
  retryStageAttemptHandler,
  getResumableQualityRunHandler,
  listStageAttemptsHandler,
} from './qualityRuns';

const NOW = 1_700_000_000_000;

const baseStart = {
  projectSlug: 'demo',
  taskKey: 'task-7',
  runId: 'run-1',
  idempotencyKey: 'idem-1',
  profileName: 'standard',
  profileVersion: 1,
  now: NOW,
};

const sampleStageAttempt = {
  projectSlug: 'demo',
  runId: 'run-1',
  stageKind: 'red' as const,
  role: 'executor' as const,
  attempt: 1,
  status: 'passed' as const,
  startedAt: NOW + 10,
  finishedAt: NOW + 30,
  evidence: { failingTestCount: 1 },
  costUSD: 0.42,
  tokens: 1_600,
  model: 'claude-sonnet-4',
  now: NOW + 30,
};

describe('qualityRuns public Convex exports', () => {
  it('registers live Convex functions for every WAL target string and resume query', () => {
    expect(qualityRunsModule.startQualityRun).toBeDefined();
    expect(qualityRunsModule.appendStageAttempt).toBeDefined();
    expect(qualityRunsModule.finishQualityRun).toBeDefined();
    expect(qualityRunsModule.markStageSkipped).toBeDefined();
    expect(qualityRunsModule.retryStageAttempt).toBeDefined();
    expect(qualityRunsModule.getResumableQualityRun).toBeDefined();
    expect(qualityRunsModule.listStageAttempts).toBeDefined();
  });
});

describe('startQualityRunHandler', () => {
  it('persists a parent quality run with profile snapshot and terminal=running', async () => {
    const ctx = createMockCtx();
    const result = await startQualityRunHandler(ctx, baseStart);
    expect(result.projectSlug).toBe('demo');
    expect(result.taskKey).toBe('task-7');
    expect(result.runId).toBe('run-1');
    expect(result.idempotencyKey).toBe('idem-1');
    expect(result.profileName).toBe('standard');
    expect(result.profileVersion).toBe(1);
    expect(result.status).toBe('running');
  });

  it('is idempotent on (idempotencyKey, projectSlug, taskKey) — replays return the same row', async () => {
    const ctx = createMockCtx();
    const first = await startQualityRunHandler(ctx, baseStart);
    const second = await startQualityRunHandler(ctx, { ...baseStart, now: NOW + 1 });
    const rows = await ctx.db.query('qualityRuns').collect();
    expect(second.runId).toBe(first.runId);
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    expect(rows).toHaveLength(1);
  });

  it('rejects reusing an idempotency key for a different runId in the same task', async () => {
    const ctx = createMockCtx();
    await startQualityRunHandler(ctx, baseStart);
    await expect(
      startQualityRunHandler(ctx, { ...baseStart, runId: 'run-2', now: NOW + 1 }),
    ).rejects.toThrow(/idempotency|runId/i);
  });

  it('allows the same idempotency key in a different project without cross-project collision', async () => {
    const ctx = createMockCtx();
    await startQualityRunHandler(ctx, baseStart);
    await startQualityRunHandler(ctx, {
      ...baseStart,
      projectSlug: 'other',
      runId: 'other-run-1',
      now: NOW + 1,
    });
    const rows = await ctx.db.query('qualityRuns').collect();
    expect(rows).toHaveLength(2);
  });

  it('rejects an empty idempotencyKey (idempotency boundary)', async () => {
    const ctx = createMockCtx();
    await expect(
      startQualityRunHandler(ctx, { ...baseStart, idempotencyKey: '' }),
    ).rejects.toThrow();
  });
});

describe('appendStageAttemptHandler', () => {
  it('appends a stage attempt with role, attempt, status, evidence, cost, tokens, model', async () => {
    const ctx = createMockCtx();
    await startQualityRunHandler(ctx, baseStart);

    const attempt = await appendStageAttemptHandler(ctx, sampleStageAttempt);
    expect(attempt.stageKind).toBe('red');
    expect(attempt.role).toBe('executor');
    expect(attempt.attempt).toBe(1);
    expect(attempt.status).toBe('passed');
    expect(attempt.startedAt).toBe(NOW + 10);
    expect(attempt.finishedAt).toBe(NOW + 30);
    expect(attempt.evidence).toEqual({ failingTestCount: 1 });
    expect(attempt.costUSD).toBe(0.42);
    expect(attempt.tokens).toBe(1_600);
    expect(attempt.model).toBe('claude-sonnet-4');
  });

  it('rejects appendStageAttempt for a run that does not exist', async () => {
    const ctx = createMockCtx();
    await expect(
      appendStageAttemptHandler(ctx, { ...sampleStageAttempt, runId: 'run-missing' }),
    ).rejects.toThrow();
  });

  it('rejects appendStageAttempt for a run that is already in a terminal state', async () => {
    const ctx = createMockCtx();
    await startQualityRunHandler(ctx, baseStart);
    await finishQualityRunHandler(ctx, {
      projectSlug: 'demo',
      runId: 'run-1',
      status: 'passed',
      now: NOW + 100,
    });
    await expect(
      appendStageAttemptHandler(ctx, { ...sampleStageAttempt, attempt: 2, status: 'passed' }),
    ).rejects.toThrow();
  });

  it('rejects appending to a runId that belongs to another project', async () => {
    const ctx = createMockCtx();
    await startQualityRunHandler(ctx, baseStart);
    await expect(
      appendStageAttemptHandler(ctx, { ...sampleStageAttempt, projectSlug: 'other' }),
    ).rejects.toThrow(/project/i);
  });
});

describe('finishQualityRunHandler — terminal transitions', () => {
  it('transitions to passed with a finishedAt timestamp', async () => {
    const ctx = createMockCtx();
    await startQualityRunHandler(ctx, baseStart);
    const result = await finishQualityRunHandler(ctx, {
      projectSlug: 'demo',
      runId: 'run-1',
      status: 'passed',
      now: NOW + 200,
    });
    expect(result.status).toBe('passed');
    expect(result.finishedAt).toBe(NOW + 200);
  });

  it('transitions to failed with a reason', async () => {
    const ctx = createMockCtx();
    await startQualityRunHandler(ctx, baseStart);
    const result = await finishQualityRunHandler(ctx, {
      projectSlug: 'demo',
      runId: 'run-1',
      status: 'failed',
      reason: 'red stage gate rejected',
      now: NOW + 200,
    });
    expect(result.status).toBe('failed');
    expect(result.reason).toBe('red stage gate rejected');
  });

  it('transitions to blocked (exhausted hard gate, not recoverable without intervention)', async () => {
    const ctx = createMockCtx();
    await startQualityRunHandler(ctx, baseStart);
    const result = await finishQualityRunHandler(ctx, {
      projectSlug: 'demo',
      runId: 'run-1',
      status: 'blocked',
      reason: 'attempts exhausted on phase_acceptance',
      now: NOW + 200,
    });
    expect(result.status).toBe('blocked');
    expect(result.reason).toBe('attempts exhausted on phase_acceptance');
  });

  it('transitions to cancelled (operator action)', async () => {
    const ctx = createMockCtx();
    await startQualityRunHandler(ctx, baseStart);
    const result = await finishQualityRunHandler(ctx, {
      projectSlug: 'demo',
      runId: 'run-1',
      status: 'cancelled',
      reason: 'profile disabled by operator',
      now: NOW + 200,
    });
    expect(result.status).toBe('cancelled');
  });

  it('rejects a terminal transition on an already-terminal run (one-way)', async () => {
    const ctx = createMockCtx();
    await startQualityRunHandler(ctx, baseStart);
    await finishQualityRunHandler(ctx, {
      projectSlug: 'demo',
      runId: 'run-1',
      status: 'passed',
      now: NOW + 100,
    });
    await expect(
      finishQualityRunHandler(ctx, {
        projectSlug: 'demo',
        runId: 'run-1',
        status: 'failed',
        now: NOW + 200,
      }),
    ).rejects.toThrow();
  });

  it('rejects an unknown terminal status', async () => {
    const ctx = createMockCtx();
    await startQualityRunHandler(ctx, baseStart);
    await expect(
      finishQualityRunHandler(ctx, {
        projectSlug: 'demo',
        runId: 'run-1',
        status: 'whatever' as never,
        now: NOW + 100,
      }),
    ).rejects.toThrow();
  });
});

describe('markStageSkippedHandler', () => {
  it('records a skipped stage with reason and attempt=0', async () => {
    const ctx = createMockCtx();
    await startQualityRunHandler(ctx, baseStart);

    const skipped = await markStageSkippedHandler(ctx, {
      projectSlug: 'demo',
      runId: 'run-1',
      stageKind: 'ux',
      reason: 'no frontend changes',
      now: NOW + 50,
    });
    expect(skipped.stageKind).toBe('ux');
    expect(skipped.status).toBe('skipped');
    expect(skipped.attempt).toBe(0);
    expect(skipped.reason).toBe('no frontend changes');
  });

  it('rejects skipping a stage after the parent run is terminal', async () => {
    const ctx = createMockCtx();
    await startQualityRunHandler(ctx, baseStart);
    await finishQualityRunHandler(ctx, {
      projectSlug: 'demo',
      runId: 'run-1',
      status: 'blocked',
      now: NOW + 100,
    });
    await expect(
      markStageSkippedHandler(ctx, {
        projectSlug: 'demo',
        runId: 'run-1',
        stageKind: 'ux',
        reason: 'no frontend changes',
        now: NOW + 101,
      }),
    ).rejects.toThrow(/terminal/i);
  });

  it('rejects an empty skip reason (audit boundary)', async () => {
    const ctx = createMockCtx();
    await startQualityRunHandler(ctx, baseStart);
    await expect(
      markStageSkippedHandler(ctx, {
        projectSlug: 'demo',
        runId: 'run-1',
        stageKind: 'ux',
        reason: '',
        now: NOW + 50,
      }),
    ).rejects.toThrow();
  });
});

describe('retryStageAttemptHandler', () => {
  it('appends a new attempt with attempt number incremented (history is append-only)', async () => {
    const ctx = createMockCtx();
    await startQualityRunHandler(ctx, baseStart);
    await appendStageAttemptHandler(ctx, sampleStageAttempt);
    const second = await retryStageAttemptHandler(ctx, {
      projectSlug: 'demo',
      runId: 'run-1',
      stageKind: 'red',
      role: 'executor',
      startedAt: NOW + 40,
      now: NOW + 40,
    });
    expect(second.attempt).toBe(2);

    const history = await listStageAttemptsHandler(ctx, {
      projectSlug: 'demo',
      runId: 'run-1',
    });
    expect(history.length).toBe(2);
    expect(history[0].attempt).toBe(1);
    expect(history[1].attempt).toBe(2);
  });

  it('rejects a retry for a stage that has no prior attempt', async () => {
    const ctx = createMockCtx();
    await startQualityRunHandler(ctx, baseStart);
    await expect(
      retryStageAttemptHandler(ctx, {
        projectSlug: 'demo',
        runId: 'run-1',
        stageKind: 'adversarial',
        role: 'reviewer',
        startedAt: NOW + 40,
        now: NOW + 40,
      }),
    ).rejects.toThrow();
  });
});

describe('getResumableQualityRunHandler', () => {
  it('returns the running run plus the list of already-passed required stage kinds', async () => {
    const ctx = createMockCtx();
    await startQualityRunHandler(ctx, baseStart);
    await appendStageAttemptHandler(ctx, sampleStageAttempt);
    await appendStageAttemptHandler(ctx, {
      ...sampleStageAttempt,
      stageKind: 'green',
      attempt: 1,
      status: 'passed',
      startedAt: NOW + 40,
      finishedAt: NOW + 60,
      now: NOW + 60,
    });

    const resumable = await getResumableQualityRunHandler(ctx, {
      projectSlug: 'demo',
      runId: 'run-1',
    });
    expect(resumable).not.toBeNull();
    expect(resumable!.status).toBe('running');
    expect(resumable!.passedRequiredStageKinds).toEqual(
      expect.arrayContaining(['red', 'green']),
    );
  });

  it('returns skipped optional stage kinds so resume does not rerun recorded skips', async () => {
    const ctx = createMockCtx();
    await startQualityRunHandler(ctx, baseStart);
    await markStageSkippedHandler(ctx, {
      projectSlug: 'demo',
      runId: 'run-1',
      stageKind: 'ux',
      reason: 'no frontend changes',
      now: NOW + 50,
    });

    const resumable = await getResumableQualityRunHandler(ctx, {
      projectSlug: 'demo',
      runId: 'run-1',
    });
    expect(resumable).not.toBeNull();
    expect(resumable!.skippedOptionalStageKinds).toEqual(['ux']);
  });

  it('does not leak a resumable run across projects sharing a runId', async () => {
    const ctx = createMockCtx();
    await startQualityRunHandler(ctx, baseStart);
    const resumable = await getResumableQualityRunHandler(ctx, {
      projectSlug: 'other',
      runId: 'run-1',
    });
    expect(resumable).toBeNull();
  });

  it('returns null once the run is in a terminal state (not resumable)', async () => {
    const ctx = createMockCtx();
    await startQualityRunHandler(ctx, baseStart);
    await finishQualityRunHandler(ctx, {
      projectSlug: 'demo',
      runId: 'run-1',
      status: 'passed',
      now: NOW + 200,
    });
    const resumable = await getResumableQualityRunHandler(ctx, {
      projectSlug: 'demo',
      runId: 'run-1',
    });
    expect(resumable).toBeNull();
  });

  it('returns null for an unknown runId', async () => {
    const ctx = createMockCtx();
    const resumable = await getResumableQualityRunHandler(ctx, {
      projectSlug: 'demo',
      runId: 'run-missing',
    });
    expect(resumable).toBeNull();
  });
});
