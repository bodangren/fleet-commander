import type { QualityWorkflowHooks } from './types';
import type {
  QualityWorkflowRunner,
  QualityStageSpec,
  StageExecutionContext,
  StageResult,
} from './qualityWorkflowRunner';
import { executeCommand } from './executor';
import { api } from '../../../convex/_generated/api';

/**
 * Creates production QualityWorkflowHooks with a runner that routes quality
 * stage execution through the existing harness/agent boundary.
 *
 * Shell-based stages (red, green, phase_acceptance) execute via Bun test
 * runners. Agent-reasoning stages (strategy, adversarial, ux, acceptance,
 * closeout) fail closed until agent dispatch is configured — preserving the
 * fail-closed contract for missing harness configuration.
 */
export function createProductionQualityWorkflowHooks(): QualityWorkflowHooks {
  const runner: QualityWorkflowRunner = {
    runStage: async (ctx: StageExecutionContext): Promise<StageResult> => {
      const { stage } = ctx;
      const maxAttempts = Math.max(stage.attempts, 1);
      let lastResult: StageResult | null = null;

      // Capture the wall-clock window for the entire runStage call
      // (including all retry attempts). startedAt is captured BEFORE any
      // attempt; finishedAt is captured AFTER the final attempt. This
      // brackets the real per-stage execution window so the dispatch
      // can forward truthful timing to `appendStageAttempt` (FR-1).
      const startedAt = Date.now();

      for (let currentAttempt = 1; currentAttempt <= maxAttempts; currentAttempt++) {
        try {
          const command = resolveStageCommand(stage);
          if (!command) {
            const finishedAt = Date.now();
            return {
              stageKind: stage.kind,
              status: 'failed',
              attempt: currentAttempt,
              feedback: {
                reason: `Stage "${stage.kind}" requires agent execution — no harness configured`,
                attempt: currentAttempt,
              },
              reason: `No harness configured for quality stage "${stage.kind}"`,
              startedAt,
              finishedAt,
            };
          }

          const { cmd, args } = command;
          const result = await executeCommand(cmd, args, stage.timeoutMs, undefined, ctx.rootPath);

          if (result.timedOut) {
            lastResult = {
              stageKind: stage.kind,
              status: 'failed',
              attempt: currentAttempt,
              feedback: {
                reason: `Stage "${stage.kind}" timed out after ${stage.timeoutMs}ms`,
                attempt: currentAttempt,
                gateEvidence: {
                  stdout: result.stdout.slice(0, 500),
                  stderr: result.stderr.slice(0, 500),
                },
              },
              reason: `Stage timed out after ${stage.timeoutMs}ms`,
            };
            if (currentAttempt < maxAttempts) continue;
            const finishedAt = Date.now();
            return { ...lastResult, startedAt, finishedAt };
          }

          if (result.exitCode !== 0) {
            lastResult = {
              stageKind: stage.kind,
              status: 'failed',
              attempt: currentAttempt,
              feedback: {
                reason: `Stage "${stage.kind}" exited with code ${result.exitCode}`,
                attempt: currentAttempt,
                gateEvidence: {
                  exitCode: result.exitCode,
                  stdout: result.stdout.slice(0, 1000),
                  stderr: result.stderr.slice(0, 1000),
                },
              },
              reason: result.stderr.slice(0, 500) || `Exit code ${result.exitCode}`,
            };
            if (currentAttempt < maxAttempts) continue;
            const finishedAt = Date.now();
            return { ...lastResult, startedAt, finishedAt };
          }

          const finishedAt = Date.now();
          return {
            stageKind: stage.kind,
            status: 'passed',
            attempt: currentAttempt,
            startedAt,
            finishedAt,
          };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          lastResult = {
            stageKind: stage.kind,
            status: 'failed',
            attempt: currentAttempt,
            feedback: { reason: msg, attempt: currentAttempt },
            reason: msg,
          };
          if (currentAttempt < maxAttempts) continue;
          const finishedAt = Date.now();
          return { ...lastResult, startedAt, finishedAt };
        }
      }

      const finishedAt = Date.now();
      return (lastResult ? { ...lastResult, startedAt, finishedAt } : {
        stageKind: stage.kind,
        status: 'failed',
        attempt: maxAttempts,
        feedback: { reason: 'Stage produced no result', attempt: maxAttempts },
        reason: 'Stage produced no result',
        startedAt,
        finishedAt,
      });
    },
  };

  const onQualityRunStart: QualityWorkflowHooks['onQualityRunStart'] = async (client, context) => {
    await client.mutation(api.qualityRuns.startQualityRun, {
      projectSlug: context.projectSlug,
      taskKey: context.taskKey,
      runId: context.runId,
      idempotencyKey: `${context.projectSlug}:${context.taskKey}:${context.runId}`,
      profileName: context.profile.profileName,
      profileVersion: context.profile.profileVersion,
      profileSnapshot: context.profile,
      now: Date.now(),
    });
  };

  const onStageResult: QualityWorkflowHooks['onStageResult'] = async (client, context) => {
    await client.mutation(api.qualityRuns.appendStageAttempt, {
      projectSlug: context.projectSlug,
      runId: context.runId,
      stageKind: context.stageKind,
      role: context.role,
      attempt: context.attempt,
      status: context.status,
      startedAt: context.startedAt,
      finishedAt: context.finishedAt,
      evidence: context.evidence,
      now: Date.now(),
    });
  };

  const onQualityRunFinish: QualityWorkflowHooks['onQualityRunFinish'] = async (client, context) => {
    await client.mutation(api.qualityRuns.finishQualityRun, {
      projectSlug: context.projectSlug,
      runId: context.runId,
      status: context.status,
      reason: context.reason,
      now: context.finishedAt,
    });
  };

  return { runner, onQualityRunStart, onStageResult, onQualityRunFinish };
}

function resolveStageCommand(
  stage: QualityStageSpec,
): { cmd: string; args: string[] } | null {
  switch (stage.kind) {
    case 'red':
      return { cmd: 'bun', args: ['test'] };
    case 'green':
      return { cmd: 'bun', args: ['test'] };
    case 'phase_acceptance':
      return { cmd: 'bun', args: ['--cwd', 'pivot', 'test'] };
    case 'strategy':
    case 'adversarial':
    case 'ux':
    case 'acceptance':
    case 'closeout':
      return null;
    default:
      return null;
  }
}
