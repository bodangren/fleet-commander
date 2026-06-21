/**
 * Phase 1 Red test: AutoRunner threads qualityWorkflowHooks into runAllProjects.
 *
 * Asserts that when qualityWorkflowHooks are supplied via AutoRunnerDeps,
 * they are forwarded to the runAllProjects call so the orchestrator hot-path
 * uses the real quality workflow runner instead of a fake pass-through.
 */

import { describe, expect, it, mock } from 'bun:test';
import { AutoRunner } from './autoRunner';
import type { QualityWorkflowHooks, GitHooks, OrchestratorConfig } from './types';

describe('AutoRunner quality workflow wiring', () => {
  it('threads qualityWorkflowHooks into the runAll call', async () => {
    const capturedConfigs: Array<{
      config: OrchestratorConfig;
      gitHooks?: GitHooks;
      qualityHooks?: QualityWorkflowHooks;
    }> = [];

    const fakeRunner: QualityWorkflowHooks = {
      runner: {
        runStage: async (ctx) => ({
          stageKind: ctx.stage.kind,
          status: 'passed',
          attempt: ctx.attempt,
        }),
      },
    };

    const runAll = mock(
      async (
        cfg: OrchestratorConfig,
        gh?: GitHooks,
        qh?: QualityWorkflowHooks,
      ) => {
        capturedConfigs.push({ config: cfg, gitHooks: gh, qualityHooks: qh });
        return [];
      },
    );

    const runner = new AutoRunner(() => 10, undefined, {
      runAll,
      qualityWorkflowHooks: fakeRunner,
    });

    runner.start();
    await new Promise((r) => setTimeout(r, 100));
    runner.stop();

    expect(capturedConfigs.length).toBeGreaterThanOrEqual(1);
    expect(capturedConfigs[0].qualityHooks).toBe(fakeRunner);
  });

  it('passes undefined qualityWorkflowHooks when none are provided', async () => {
    let capturedQualityHooks: QualityWorkflowHooks | undefined = 'sentinel' as unknown as QualityWorkflowHooks;

    const runAll = mock(
      async (
        _cfg: OrchestratorConfig,
        _gh?: GitHooks,
        qh?: QualityWorkflowHooks,
      ) => {
        capturedQualityHooks = qh;
        return [];
      },
    );

    const runner = new AutoRunner(() => 10, undefined, { runAll });

    runner.start();
    await new Promise((r) => setTimeout(r, 100));
    runner.stop();

    expect(capturedQualityHooks).toBeUndefined();
  });
});
