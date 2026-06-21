/**
 * Phase 2 Red tests for quality-workflow dispatch lifecycle hooks.
 *
 * This test proves that `runConfiguredQualityWorkflow` invokes the
 * `onStageResult` hook for every executed stage so that production
 * boundary mutations (`appendStageAttempt`) are actually reached. At
 * HEAD the function calls `onQualityRunStart` and `onQualityRunFinish`
 * but never `onStageResult`, so this test fails.
 */

import { describe, expect, it, mock } from 'bun:test';
import { runConfiguredQualityWorkflow } from './qualityWorkflowDispatch';
import { BUILTIN_STANDARD_PROFILE } from '../shared/qualityProfile';
import type { QualityWorkflowHooks, Task } from './types';
import type { QualityWorkflowRunner, StageResult } from './qualityWorkflowRunner';

const sampleTask: Task = {
  projectSlug: 'test-project',
  trackId: 'track-1',
  taskKey: 'T-1',
  title: 'Test task',
  status: 'ready',
  dependencies: [],
  updatedAt: Date.now(),
};

describe('runConfiguredQualityWorkflow — onStageResult lifecycle hook', () => {
  it('calls onStageResult for every executed stage result', async () => {
    const onStageResult = mock(async () => {});
    const onQualityRunStart = mock(async () => {});
    const onQualityRunFinish = mock(async () => {});
    const recordProfileSnapshot = mock(async () => {});

    const runner: QualityWorkflowRunner = {
      runStage: mock(async (ctx: any): Promise<StageResult> => {
        return {
          stageKind: ctx.stage.kind,
          status: 'passed',
          attempt: ctx.attempt ?? 1,
        };
      }),
    };

    const hooks: QualityWorkflowHooks = {
      getEffectiveProfile: async () => BUILTIN_STANDARD_PROFILE,
      recordProfileSnapshot,
      runner,
      onQualityRunStart,
      onStageResult,
      onQualityRunFinish,
    };

    const client = {
      query: mock(async () => ({})),
      mutation: mock(async () => ({})),
    } as any;

    const result = await runConfiguredQualityWorkflow(
      client,
      sampleTask.projectSlug,
      sampleTask,
      'run-1',
      '/tmp/test-project',
      undefined,
      hooks,
    );

    expect(result).not.toBeNull();
    expect(result!.status).toBe('passed');

    expect(onQualityRunStart).toHaveBeenCalled();
    expect(onQualityRunFinish).toHaveBeenCalled();

    // The standard profile has strategy (skipped), red, green, and phase_acceptance.
    // onStageResult must fire for the executed stages.
    expect(onStageResult).toHaveBeenCalledTimes(3);

    const calls = onStageResult.mock.calls as unknown[][];
    const firstCall = calls[0];
    expect(firstCall[0]).toBe(client);
    expect(firstCall[1]).toMatchObject({
      projectSlug: sampleTask.projectSlug,
      taskKey: sampleTask.taskKey,
      runId: 'run-1',
      stageKind: 'red',
      role: 'executor',
      attempt: 1,
      status: 'passed',
    });
    expect(typeof (firstCall[1] as any).startedAt).toBe('number');
    expect(typeof (firstCall[1] as any).finishedAt).toBe('number');
  });
});
