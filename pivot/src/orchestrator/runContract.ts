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
