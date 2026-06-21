/**
 * Phase 2 Red tests for quality-workflow runtime-context forwarding.
 *
 * These tests tighten the runner contract so that stage execution is
 * aware of the surrounding dispatch context (project, task, run, rootPath)
 * and the current attempt number. They fail at HEAD because
 * `sequenceQualityStages` and `runQualityWorkflow` call the executor with
 * only the bare `QualityStageSpec`.
 */

import { describe, expect, it, mock } from 'bun:test';
import {
  sequenceQualityStages,
  runQualityWorkflow,
  type QualityStageSpec,
  type StageContext,
  type StageExecutor,
  type StageResult,
  type QualityWorkflowRunner,
  type CloseoutEligibilityContext,
} from './qualityWorkflowRunner';

function stageSpec(overrides: Partial<QualityStageSpec> = {}): QualityStageSpec {
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

function stageContext(overrides: Partial<StageContext> = {}): StageContext {
  return {
    trackIsSetup: false,
    hasFrontendChanges: false,
    isFinalAcceptance: false,
    isFinalCloseout: false,
    ...overrides,
  };
}

interface StageExecutionContext {
  stage: QualityStageSpec;
  attempt: number;
  projectSlug: string;
  taskKey: string;
  runId: string;
  rootPath: string;
}

describe('sequenceQualityStages — runtime context contract', () => {
  it('passes a runtime execution context to the stage executor', async () => {
    let captured: StageExecutionContext | undefined;

    const executor = mock(async (ctx: StageExecutionContext): Promise<StageResult> => {
      captured = ctx;
      return {
        stageKind: ctx.stage.kind,
        status: 'passed',
        attempt: ctx.attempt,
      };
    }) as unknown as StageExecutor;

    const runtimeContext = {
      projectSlug: 'test-project',
      taskKey: 'T-1',
      runId: 'run-1',
      rootPath: '/tmp/test-project',
    };

    await (sequenceQualityStages as any)(
      [stageSpec({ kind: 'red' })],
      stageContext(),
      executor,
      runtimeContext,
    );

    expect(captured).toBeDefined();
    expect(captured!.stage).toBeDefined();
    expect(captured!.stage.kind).toBe('red');
    expect(captured!.attempt).toBe(1);
    expect(captured!).toMatchObject(runtimeContext);
  });

  it('increments attempt in the execution context across gate-feedback retries', async () => {
    const captured: StageExecutionContext[] = [];
    let invocation = 0;

    const executor = mock(async (ctx: StageExecutionContext): Promise<StageResult> => {
      captured.push(ctx);
      invocation += 1;
      if (invocation === 1) {
        return {
          stageKind: ctx.stage.kind,
          status: 'gate_feedback',
          attempt: ctx.attempt,
          feedback: {
            reason: 'Gate red: expected one failing test',
            attempt: ctx.attempt,
          },
        };
      }
      return {
        stageKind: ctx.stage.kind,
        status: 'passed',
        attempt: ctx.attempt,
      };
    }) as unknown as StageExecutor;

    const runtimeContext = {
      projectSlug: 'test-project',
      taskKey: 'T-1',
      runId: 'run-1',
      rootPath: '/tmp/test-project',
    };

    const result = await (sequenceQualityStages as any)(
      [stageSpec({ kind: 'red', attempts: 2 })],
      stageContext(),
      executor,
      runtimeContext,
    );

    expect(result.outcome).toBe('passed');
    expect(captured).toHaveLength(2);
    expect(captured[0].attempt).toBe(1);
    expect(captured[1].attempt).toBe(2);
    expect(captured[0]).toMatchObject(runtimeContext);
    expect(captured[1]).toMatchObject(runtimeContext);
  });
});

describe('runQualityWorkflow — runtime context propagation', () => {
  it('forwards runtime context to the injected runner for each stage', async () => {
    const captured: StageExecutionContext[] = [];

    const runner: QualityWorkflowRunner = {
      runStage: mock(async (ctx: StageExecutionContext): Promise<StageResult> => {
        captured.push(ctx);
        return {
          stageKind: ctx.stage.kind,
          status: 'passed',
          attempt: ctx.attempt,
        };
      }) as unknown as QualityWorkflowRunner['runStage'],
    };

    const runtimeContext = {
      projectSlug: 'test-project',
      taskKey: 'T-1',
      runId: 'run-1',
      rootPath: '/tmp/test-project',
    };

    await (runQualityWorkflow as any)(
      [
        stageSpec({ kind: 'red' }),
        stageSpec({ kind: 'green' }),
      ],
      stageContext(),
      runner,
      {
        isFinalCloseout: false,
        verifyPassed: false,
        orphansPassed: false,
      } as CloseoutEligibilityContext,
      runtimeContext,
    );

    expect(captured).toHaveLength(2);
    expect(captured[0].stage.kind).toBe('red');
    expect(captured[1].stage.kind).toBe('green');
    for (const ctx of captured) {
      expect(ctx).toMatchObject(runtimeContext);
      expect(typeof ctx.attempt).toBe('number');
    }
  });
});
