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

      for (let currentAttempt = 1; currentAttempt <= maxAttempts; currentAttempt++) {
        try {
          const command = resolveStageCommand(stage);
          if (!command) {
            return {
              stageKind: stage.kind,
              status: 'failed',
              attempt: currentAttempt,
              feedback: {
                reason: `Stage "${stage.kind}" requires agent execution — no harness configured`,
                attempt: currentAttempt,
              },
              reason: `No harness configured for quality stage "${stage.kind}"`,
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
            return lastResult;
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
            return lastResult;
          }

          return {
            stageKind: stage.kind,
            status: 'passed',
            attempt: currentAttempt,
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
          return lastResult;
        }
      }

      return lastResult ?? {
        stageKind: stage.kind,
        status: 'failed',
        attempt: maxAttempts,
        feedback: { reason: 'Stage produced no result', attempt: maxAttempts },
        reason: 'Stage produced no result',
      };
    },
  };

  const onQualityRunStart: QualityWorkflowHooks['onQualityRunStart'] = async (client, context) => {
    await (client as any).mutation(api.qualityRuns.startQualityRun, {
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
    await (client as any).mutation(api.qualityRuns.appendStageAttempt, {
      projectSlug: context.projectSlug,
      runId: context.runId,
      stageKind: context.stageKind,
      role: context.role,
      attempt: context.attempt,
      status: context.status,
      startedAt: context.startedAt,
      finishedAt: context.finishedAt,
      evidence: context.evidence,
    });
  };

  const onQualityRunFinish: QualityWorkflowHooks['onQualityRunFinish'] = async (client, context) => {
    await (client as any).mutation(api.qualityRuns.finishQualityRun, {
      projectSlug: context.projectSlug,
      runId: context.runId,
      status: context.status,
      reason: context.reason,
      finishedAt: context.finishedAt,
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
