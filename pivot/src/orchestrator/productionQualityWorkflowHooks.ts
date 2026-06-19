import type { QualityWorkflowHooks } from './types';
import type {
  QualityWorkflowRunner,
  QualityStageSpec,
  StageResult,
} from './qualityWorkflowRunner';
import { executeCommand } from './executor';

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
    runStage: async (stage: QualityStageSpec): Promise<StageResult> => {
      const startMs = Date.now();
      const attempt = 1;

      try {
        const command = resolveStageCommand(stage);
        if (!command) {
          return {
            stageKind: stage.kind,
            status: 'failed',
            attempt,
            feedback: {
              reason: `Stage "${stage.kind}" requires agent execution — no harness configured`,
              attempt,
            },
            reason: `No harness configured for quality stage "${stage.kind}"`,
          };
        }

        const { cmd, args } = command;
        const result = await executeCommand(cmd, args, stage.timeoutMs);
        const durationMs = Date.now() - startMs;

        if (result.timedOut) {
          return {
            stageKind: stage.kind,
            status: 'failed',
            attempt,
            feedback: {
              reason: `Stage "${stage.kind}" timed out after ${stage.timeoutMs}ms`,
              attempt,
              gateEvidence: {
                stdout: result.stdout.slice(0, 500),
                stderr: result.stderr.slice(0, 500),
              },
            },
            reason: `Stage timed out after ${stage.timeoutMs}ms`,
          };
        }

        if (result.exitCode !== 0) {
          return {
            stageKind: stage.kind,
            status: 'failed',
            attempt,
            feedback: {
              reason: `Stage "${stage.kind}" exited with code ${result.exitCode}`,
              attempt,
              gateEvidence: {
                exitCode: result.exitCode,
                stdout: result.stdout.slice(0, 1000),
                stderr: result.stderr.slice(0, 1000),
              },
            },
            reason: result.stderr.slice(0, 500) || `Exit code ${result.exitCode}`,
          };
        }

        return {
          stageKind: stage.kind,
          status: 'passed',
          attempt,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          stageKind: stage.kind,
          status: 'failed',
          attempt,
          feedback: { reason: msg, attempt },
          reason: msg,
        };
      }
    },
  };

  return { runner };
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
