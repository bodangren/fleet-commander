import {
  ArchitectOutputSchema,
  ExecutorOutputSchema,
  ReviewerOutputSchema,
  RecoveryOutputSchema,
  RunContractSchema,
  type StageName,
} from '../shared/runContract';

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
