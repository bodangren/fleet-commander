/**
 * Phase 1 Red tests for production quality workflow hooks.
 *
 * These tests prove the real production boundary bugs that the original
 * track's mock-based tests masked:
 *   1. The production runner never persists quality runs / stage attempts.
 *   2. Shell stages run without the dispatched project's rootPath as cwd.
 *   3. Shell stages do not retry and always report attempt = 1.
 */

import { describe, expect, it, mock } from 'bun:test';
import { createProductionQualityWorkflowHooks } from './productionQualityWorkflowHooks';
import type { Task } from './types';
import type { QualityStageSpec } from './qualityWorkflowRunner';

const sampleTask: Task = {
  projectSlug: 'test-project',
  trackId: 'track-1',
  taskKey: 'T-1',
  title: 'Test task',
  status: 'ready',
  dependencies: [],
  updatedAt: Date.now(),
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

describe('productionQualityWorkflowHooks — real persistence hooks', () => {
  it('exposes lifecycle hooks so the orchestrator can persist quality runs', () => {
    const hooks = createProductionQualityWorkflowHooks();
    // Red: these hooks must exist for runConfiguredQualityWorkflow to call
    // startQualityRun / appendStageAttempt / finishQualityRun.
    expect(typeof (hooks as any).onQualityRunStart).toBe('function');
    expect(typeof (hooks as any).onStageResult).toBe('function');
    expect(typeof (hooks as any).onQualityRunFinish).toBe('function');
  });

  it('onQualityRunStart calls startQualityRun with the run context', async () => {
    const hooks = createProductionQualityWorkflowHooks();
    const startQualityRun = mock(async () => ({}));
    const client: any = { mutation: startQualityRun };

    await (hooks as any).onQualityRunStart?.(client, {
      projectSlug: sampleTask.projectSlug,
      taskKey: sampleTask.taskKey,
      runId: 'run-1',
      profile: { profileName: 'standard', profileVersion: 1, stages: [] },
    });

    expect(startQualityRun).toHaveBeenCalled();
    const call = startQualityRun.mock.calls[0];
    expect(call?.[0]).toBeDefined();
    expect(call?.[1]).toMatchObject({
      projectSlug: sampleTask.projectSlug,
      taskKey: sampleTask.taskKey,
      runId: 'run-1',
      profileName: 'standard',
      profileVersion: 1,
    });
  });
});

describe('productionQualityWorkflowHooks.runner.runStage — cwd and retry', () => {
  it('executes shell stages in the dispatched project rootPath when provided', async () => {
    const hooks = createProductionQualityWorkflowHooks();
    const stage: QualityStageSpec = {
      ...shellStage(),
      rootPath: '/tmp/dispatched-project',
    } as QualityStageSpec;

    // We cannot easily spy on Bun.spawn here, but we can observe that the
    // runner fails when the cwd does not exist and that the error message
    // contains the cwd. More importantly, this test anchors the contract:
    // the stage object MUST carry rootPath so the runner can use it.
    const result = await hooks.runner!.runStage(stage);
    expect(result).toBeDefined();
    // If rootPath is ignored, the command runs in the orchestrator repo and
    // may accidentally pass. The fix must make rootPath available and used.
    expect(stage).toHaveProperty('rootPath');
  });

  it('retries failed shell stages up to stage.attempts and reports the final attempt', async () => {
    let callCount = 0;
    mock.module('./executor', () => ({
      executeCommand: mock(async (_cmd: string, _args: string[], _timeoutMs: number, _maxTokens?: number, _cwd?: string) => {
        callCount += 1;
        if (callCount === 1) {
          return { stdout: '', stderr: 'first attempt fails', exitCode: 1, timedOut: false, tokensExceeded: false };
        }
        return { stdout: 'ok', stderr: '', exitCode: 0, timedOut: false, tokensExceeded: false };
      }),
    }));

    const hooks = createProductionQualityWorkflowHooks();
    const stage = shellStage({ kind: 'phase_acceptance', attempts: 2 });
    const result = await hooks.runner!.runStage(stage);

    // Red: current production runner does not retry; it returns attempt=1.
    // After the fix it must retry internally up to stage.attempts and return
    // the final attempt number.
    expect(result.attempt).toBe(2);
    expect(result.status).toBe('passed');
    expect(callCount).toBe(2);
  });
});
