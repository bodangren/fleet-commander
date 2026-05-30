import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import type {
  ArchitectOutput,
  ExecutorOutput,
  ReviewerOutput,
  RecoveryOutput,
  StageName,
} from '../shared/runContract';
import {
  ArchitectOutputSchema,
  ExecutorOutputSchema,
  ReviewerOutputSchema,
  RecoveryOutputSchema,
  RunContractSchema,
} from '../shared/runContract';
import type { DispatchRejection } from './constraints';

export {
  RunContract,
  ArchitectOutput,
  ExecutorOutput,
  ReviewerOutput,
  RecoveryOutput,
  isRunContract,
  isArchitectOutput,
  isExecutorOutput,
  isReviewerOutput,
  isRecoveryOutput,
  type StageName,
  type RunContract as RunContractType,
  type ArchitectOutput as ArchitectOutputType,
  type ExecutorOutput as ExecutorOutputType,
  type ReviewerOutput as ReviewerOutputType,
  type RecoveryOutput as RecoveryOutputType,
} from '../shared/runContract';

export interface ValidationResult {
  action: 'validated' | 'error';
  error?: string;
  rawOutput?: unknown;
}

/**
 * Parses and validates stage output against Zod schemas, returning ValidationResult.
 */
export function validateAndParse(
  stage: StageName,
  output: unknown,
): ValidationResult | null {
  switch (stage) {
    case 'architect': {
      const result = ArchitectOutputSchema.safeParse(output);
      if (result.success) {
        return { action: 'validated' };
      }
      return {
        action: 'error',
        error: result.error.message,
        rawOutput: output,
      };
    }
    case 'executor': {
      const result = ExecutorOutputSchema.safeParse(output);
      if (result.success) {
        return { action: 'validated' };
      }
      return {
        action: 'error',
        error: result.error.message,
        rawOutput: output,
      };
    }
    case 'reviewer': {
      const result = ReviewerOutputSchema.safeParse(output);
      if (result.success) {
        return { action: 'validated' };
      }
      return {
        action: 'error',
        error: result.error.message,
        rawOutput: output,
      };
    }
    case 'recovery': {
      const result = RecoveryOutputSchema.safeParse(output);
      if (result.success) {
        return { action: 'validated' };
      }
      return {
        action: 'error',
        error: result.error.message,
        rawOutput: output,
      };
    }
    default:
      return null;
  }
}

export class RunContractValidationError extends Error {
  constructor(
    public stage: StageName,
    public rawOutput: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'RunContractValidationError';
  }
}

/**
 * Infers task kind (bug, chore, feature, review) from taskId and changedFiles track name.
 */
function deriveTaskKind(taskId: string, changedFiles: string[]): string {
  // Infer from track name in changed plan.md — most reliable signal
  const planMatch = changedFiles.find((f) =>
    f.toLowerCase().includes('measure/tracks/'),
  );
  if (planMatch) {
    const trackName = planMatch.split('measure/tracks/')[1]?.split('/')[0] ?? '';
    const lower = trackName.toLowerCase();
    if (lower.startsWith('fix_') || lower.includes('_bug_')) return 'bug';
    if (lower.startsWith('chore_') || lower.includes('_cleanup_')) return 'chore';
    if (lower.includes('_review_')) return 'review';
    if (lower.startsWith('feat_') || lower.startsWith('feature_')) return 'feature';
  }

  // Fragile fallback: taskId heuristics don't work for UUID-style IDs
  const lower = taskId.toLowerCase();
  if (lower.includes('bug') || lower.includes('fix')) return 'bug';
  if (lower.includes('chore') || lower.includes('cleanup') || lower.includes('maintenance')) return 'chore';
  if (lower.includes('review')) return 'review';
  if (lower.includes('feature')) return 'feature';
  return 'unknown'; // Don't default to 'feature' — avoids false enforcement
}

/**
 * Checks if a file path is a source file (excludes .test. and .spec. files).
 */
function isSourceFile(file: string): boolean {
  const normalized = file.toLowerCase();
  return (
    (normalized.startsWith('src/') ||
      normalized.startsWith('pivot/') ||
      normalized.startsWith('frontend/') ||
      normalized.startsWith('convex/') ||
      normalized.startsWith('measure/')) &&
    !normalized.includes('.test.') &&
    !normalized.includes('.spec.')
  );
}

/**
 * Checks whether changedFiles include a measure/tracks/<track>/plan.md update.
 */
function hasPlanUpdate(changedFiles: string[]): boolean {
  return changedFiles.some((f) =>
    f.toLowerCase().startsWith('measure/tracks/') && f.toLowerCase().endsWith('/plan.md'),
  );
}

export function validateExecutorEnforcement(
  taskId: string,
  output: ExecutorOutput,
): string | null {
  const changedFiles = output.changedFiles;
  const testsRun = output.testsRun;
  const taskKind = deriveTaskKind(taskId, changedFiles);

  // Measure Workflow Enforcement
  const hasSourceChanges = changedFiles.some(isSourceFile);
  if (hasSourceChanges && !hasPlanUpdate(changedFiles)) {
    return `Measure workflow violation: source files were modified but measure/tracks/<track_id>/plan.md was not updated`;
  }

  // Mandatory Testing Enforcement
  if ((taskKind === 'feature' || taskKind === 'bug') && hasSourceChanges) {
    if (!testsRun || testsRun.length === 0) {
      return `Mandatory testing violation: ${taskKind} task modified source files but no tests were run`;
    }
  }

  return null;
}

/**
 * Creates a RunContract in Convex if one does not already exist for the task.
 */
export async function createRunContractIfNeeded(
  client: ConvexHttpClient,
  taskId: string,
  projectSlug: string,
  objective: string,
  scope: string[],
  acceptanceCriteria: string[],
): Promise<void> {
  const existing = await client.query(api.runContracts.getRunContract, { taskId });
  if (!existing) {
    await client.mutation(api.runContracts.createRunContract, {
      taskId,
      projectSlug,
      objective,
      scope,
      acceptanceCriteria,
    });
  }
}

/**
 * Validates stage output and persists it to Convex via the appropriate mutation.
 */
export async function validateAndPersist(
  client: ConvexHttpClient,
  taskId: string,
  stage: StageName,
  output: unknown,
): Promise<void> {
  const result = validateAndParse(stage, output);
  if (!result || result.action === 'error') {
    throw new RunContractValidationError(
      stage,
      output,
      result?.error ?? `Invalid ${stage} output`,
    );
  }

  switch (stage) {
    case 'architect': {
      const data = output as ArchitectOutput;
      await client.mutation(api.runContracts.appendArchitectOutput, {
        taskId,
        output: data.output,
        confidence: data.confidence,
        assumptions: data.assumptions,
      });
      break;
    }
    case 'executor': {
      const data = output as ExecutorOutput;
      const enforcementError = validateExecutorEnforcement(taskId, data);
      if (enforcementError) {
        throw new RunContractValidationError(
          stage,
          output,
          enforcementError,
        );
      }
      await client.mutation(api.runContracts.appendExecutorOutput, {
        taskId,
        changedFiles: data.changedFiles,
        testsRun: data.testsRun,
        unresolvedAssumptions: data.unresolvedAssumptions,
        confidence: data.confidence,
        branch: data.branch,
        commit: data.commit,
        status: data.status,
      });
      break;
    }
    case 'reviewer': {
      const data = output as ReviewerOutput;
      await client.mutation(api.runContracts.appendReviewerOutput, {
        taskId,
        status: data.status,
        summary: data.summary,
        issueClass: data.issueClass,
        severity: data.severity,
        resolvedAssumptions: data.resolvedAssumptions,
      });
      break;
    }
    case 'recovery': {
      const data = output as RecoveryOutput;
      await client.mutation(api.runContracts.appendRecoveryOutput, {
        taskId,
        action: data.action,
        reason: data.reason,
      });
      break;
    }
    default:
      throw new Error(`Unknown stage: ${stage}`);
  }
}

/**
 * Appends dispatch rejections to an existing RunContract in Convex.
 */
export async function appendDispatchRejections(
  client: ConvexHttpClient,
  taskId: string,
  rejections: DispatchRejection[],
): Promise<void> {
  if (rejections.length === 0) return;
  await client.mutation(api.runContracts.appendDispatchRejections, {
    taskId,
    rejections,
  });
}
