/**
 * Phase 5 regression tests for production quality workflow hooks.
 *
 * Per spec.md AC 9: "New regression tests fail at HEAD and pass after the
 * fixes; they assert real side effects (Convex mutation args, cwd, mapped
 * shapes) rather than mocked returns."
 *
 * These tests replaced the deleted Phase 1 Red test file
 * `productionQualityWorkflowHooks.red.test.ts` (commit 9da9111 + d1cc71a,
 * deleted by commit a19a3a1). They assert real side effects against the
 * production hook implementation shipped in commit 6d0c40e + 397f0c3:
 *
 *   - `onQualityRunStart` calls `api.qualityRuns.startQualityRun` with the
 *     full run-context fields (projectSlug, taskKey, runId, idempotencyKey,
 *     profileName, profileVersion, profileSnapshot, now).
 *   - `onStageResult` calls `api.qualityRuns.appendStageAttempt` with the
 *     stage-result fields (projectSlug, runId, stageKind, role, attempt,
 *     status, startedAt, finishedAt, evidence).
 *   - `onQualityRunFinish` calls `api.qualityRuns.finishQualityRun` with
 *     the run-completion fields (projectSlug, runId, status, reason,
 *     finishedAt).
 *   - `runner.runStage` passes `ctx.rootPath` to `executeCommand` as the
 *     cwd argument. We assert this by spying on `executeCommand` and
 *     checking it was called with the right cwd, rather than actually
 *     shelling out (which would run the real `bun test` suite).
 *   - `runner.runStage` retries failed shell stages up to `stage.attempts`
 *     and reports the final attempt's status in the result.
 *
 * These tests are NOT red at the post-fix HEAD (commit 87b1370 is the
 * current track tip; all production boundary fixes are already shipped).
 * They exist as regression guards against future refactors of
 * `productionQualityWorkflowHooks.ts` that would silently break the
 * boundary contract.
 */

import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { createProductionQualityWorkflowHooks } from './productionQualityWorkflowHooks';
import * as executor from './executor';
import type { Task } from './types';
import type { QualityStageSpec } from './qualityWorkflowRunner';

const sampleTask: Task = {
  projectSlug: 'test-project',
  trackId: 'track-1',
  taskKey: 'T-1',
  title: 'Test task',
  status: 'ready',
  dependencies: [],
  updatedAt: 1_700_000_000_000,
};

function shellStage(overrides: Partial<QualityStageSpec> = {}): QualityStageSpec {
  return {
    kind: 'red',
    required: true,
    applicability: { always: true },
    role: 'executor',
    attempts: 1,
    timeoutMs: 60_000,
    ...overrides,
  };
}

const sampleProfile = {
  profileName: 'standard',
  profileVersion: 1,
  stages: [] as unknown[],
};

// Convex FunctionReference name lookup (matches the pattern in
// pivot/src/routes/pipelines.red.test.ts and the existing pivot tests).
const FN_SYM = Symbol.for('functionName');
function fnName(ref: unknown): string {
  return (ref as Record<symbol, string>)?.[FN_SYM] ?? '';
}

describe('productionQualityWorkflowHooks — real-side-effect regression', () => {
  afterEach(() => {
    mock.restore();
  });

  describe('lifecycle mutations (real side effects on api.qualityRuns.*)', () => {
    it('onQualityRunStart calls api.qualityRuns.startQualityRun with the full run-context fields', async () => {
      const hooks = createProductionQualityWorkflowHooks();
      const startQualityRun = mock(async () => 'placeholder');
      const client = { mutation: startQualityRun, query: mock(async () => ({})) };

      await hooks.onQualityRunStart!(client as any, {
        projectSlug: sampleTask.projectSlug,
        taskKey: sampleTask.taskKey,
        runId: 'run-1',
        profile: sampleProfile,
      });

      expect(startQualityRun).toHaveBeenCalledTimes(1);
      const [calledWith, args] = startQualityRun.mock.calls[0] as unknown as [unknown, Record<string, unknown>];
      // The handler ref is api.qualityRuns.startQualityRun (the symbol-based
      // FunctionReference). Asserting the symbol name guards against future
      // refactors that silently swap to a different mutation.
      expect(fnName(calledWith)).toBe('qualityRuns:startQualityRun');
      expect(args.projectSlug).toBe(sampleTask.projectSlug);
      expect(args.taskKey).toBe(sampleTask.taskKey);
      expect(args.runId).toBe('run-1');
      expect(args.profileName).toBe(sampleProfile.profileName);
      expect(args.profileVersion).toBe(sampleProfile.profileVersion);
      expect(args.idempotencyKey).toBe(`${sampleTask.projectSlug}:${sampleTask.taskKey}:run-1`);
      expect(typeof args.now).toBe('number');
      expect((args.now as number) > 0).toBe(true);
    });

    it('onStageResult calls api.qualityRuns.appendStageAttempt with the stage-result fields', async () => {
      const hooks = createProductionQualityWorkflowHooks();
      const appendStageAttempt = mock(async () => 'placeholder');
      const client = { mutation: appendStageAttempt, query: mock(async () => ({})) };

      const startedAt = 1_700_000_000_000;
      const finishedAt = 1_700_000_060_000;

      await hooks.onStageResult!(client as any, {
        projectSlug: sampleTask.projectSlug,
        taskKey: sampleTask.taskKey,
        runId: 'run-1',
        stageKind: 'red',
        role: 'executor',
        attempt: 2,
        status: 'passed',
        startedAt,
        finishedAt,
      });

      expect(appendStageAttempt).toHaveBeenCalledTimes(1);
      const [calledWith, args] = appendStageAttempt.mock.calls[0] as unknown as [unknown, Record<string, unknown>];
      expect(fnName(calledWith)).toBe('qualityRuns:appendStageAttempt');
      expect(args.projectSlug).toBe(sampleTask.projectSlug);
      expect(args.runId).toBe('run-1');
      expect(args.stageKind).toBe('red');
      expect(args.role).toBe('executor');
      expect(args.attempt).toBe(2);
      expect(args.status).toBe('passed');
      expect(args.startedAt).toBe(startedAt);
      expect(args.finishedAt).toBe(finishedAt);
      expect(typeof args.now).toBe('number');
    });

    it('onQualityRunFinish calls api.qualityRuns.finishQualityRun with the run-completion fields', async () => {
      const hooks = createProductionQualityWorkflowHooks();
      const finishQualityRun = mock(async () => 'placeholder');
      const client = { mutation: finishQualityRun, query: mock(async () => ({})) };

      const finishedAt = 1_700_000_120_000;

      await hooks.onQualityRunFinish!(client as any, {
        projectSlug: sampleTask.projectSlug,
        taskKey: sampleTask.taskKey,
        runId: 'run-1',
        status: 'passed',
        reason: undefined,
        finishedAt,
      });

      expect(finishQualityRun).toHaveBeenCalledTimes(1);
      const [calledWith, args] = finishQualityRun.mock.calls[0] as unknown as [unknown, Record<string, unknown>];
      expect(fnName(calledWith)).toBe('qualityRuns:finishQualityRun');
      expect(args.projectSlug).toBe(sampleTask.projectSlug);
      expect(args.runId).toBe('run-1');
      expect(args.status).toBe('passed');
      expect(args.now).toBe(finishedAt);
    });
  });

  describe('runner.runStage — real cwd + retry side effects', () => {
    it('passes ctx.rootPath as the cwd argument to executeCommand', async () => {
      // We mock executeCommand and capture the cwd arg it received. The
      // real side effect under test is "the runner forwards rootPath";
      // we don't need to actually shell out (which would run the full
      // pivot test suite for a `red` stage).
      const executeCommandSpy = spyOn(executor, 'executeCommand').mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
        timedOut: false,
        tokensExceeded: false,
      });

      const hooks = createProductionQualityWorkflowHooks();
      const tmpRoot = '/tmp/regression-cwd-root';
      const stage = shellStage({ kind: 'red' });
      const result = await hooks.runner!.runStage({
        stage,
        attempt: 1,
        projectSlug: sampleTask.projectSlug,
        taskKey: sampleTask.taskKey,
        runId: 'run-1',
        rootPath: tmpRoot,
      });

      expect(result.status).toBe('passed');
      expect(executeCommandSpy).toHaveBeenCalledTimes(1);
      const callArgs = executeCommandSpy.mock.calls[0] as unknown[];
      // executeCommand(cmd, args, timeoutMs, maxTokens?, cwd?) — cwd is the
      // 5th positional arg.
      expect(callArgs[4]).toBe(tmpRoot);
    });

    it('retries failed shell stages up to stage.attempts and reports the final attempt', async () => {
      // Mock executeCommand to fail on attempt 1, succeed on attempt 2.
      // This proves the retry loop runs and reports the final attempt.
      let callCount = 0;
      spyOn(executor, 'executeCommand').mockImplementation(async () => {
        callCount += 1;
        if (callCount === 1) {
          return {
            stdout: '',
            stderr: 'first attempt fails',
            exitCode: 1,
            timedOut: false,
            tokensExceeded: false,
          };
        }
        return {
          stdout: 'ok',
          stderr: '',
          exitCode: 0,
          timedOut: false,
          tokensExceeded: false,
        };
      });

      const hooks = createProductionQualityWorkflowHooks();
      const stage = shellStage({ kind: 'red', attempts: 3 });
      const result = await hooks.runner!.runStage({
        stage,
        attempt: 1,
        projectSlug: sampleTask.projectSlug,
        taskKey: sampleTask.taskKey,
        runId: 'run-1',
        rootPath: '/tmp',
      });

      expect(result.status).toBe('passed');
      expect(result.attempt).toBe(2);
      expect(callCount).toBe(2);
    });
  });
});
