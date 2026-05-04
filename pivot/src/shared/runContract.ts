import { z } from 'zod';

export const ArchitectOutputSchema = z.object({
  output: z.string().describe('Architectural design or approach'),
  confidence: z.number().min(0).max(1).describe('Confidence score 0-1'),
  assumptions: z.array(z.string()).default([]).describe('Key assumptions'),
  suggestedHarness: z.string().optional().describe('Recommended harness name'),
});

export type ArchitectOutput = z.infer<typeof ArchitectOutputSchema>;

export const ExecutorOutputSchema = z.object({
  changedFiles: z.array(z.string()).describe('List of files modified'),
  testsRun: z.array(z.string()).default([]).describe('Tests executed'),
  unresolvedAssumptions: z.array(z.string()).default([]).describe('Assumptions not verified'),
  confidence: z.number().min(0).max(1).describe('Confidence score 0-1'),
  branch: z.string().describe('Git branch name'),
  commit: z.string().describe('Git commit hash'),
  status: z.enum(['succeeded', 'failed']).describe('Execution status'),
});

export type ExecutorOutput = z.infer<typeof ExecutorOutputSchema>;

export const ReviewerOutputSchema = z.object({
  status: z.enum(['passed', 'failed', 'needs-changes']).describe('Review outcome'),
  summary: z.string().describe('Review summary'),
  issueClass: z
    .enum(['correctness', 'security', 'performance', 'style', 'spec_mismatch'])
    .describe('Issue classification'),
  severity: z.enum(['blocker', 'major', 'minor']).describe('Issue severity'),
  resolvedAssumptions: z
    .boolean()
    .optional()
    .describe('Whether architect and executor assumptions were validated'),
  agentComments: z
    .array(
      z.object({
        file: z.string(),
        line: z.number(),
        severity: z.string(),
        message: z.string(),
      }),
    )
    .optional()
    .describe('Detailed review comments'),
  depth: z.string().optional().describe('Review depth level'),
});

export type ReviewerOutput = z.infer<typeof ReviewerOutputSchema>;

export const RecoveryOutputSchema = z.object({
  action: z
    .enum(['retry', 'escalate', 'split', 'replan', 'human_review'])
    .describe('Recovery action taken'),
  reason: z.string().describe('Explanation for recovery decision'),
});

export type RecoveryOutput = z.infer<typeof RecoveryOutputSchema>;

export const RunContractStagesSchema = z.object({
  architect: ArchitectOutputSchema.optional(),
  executor: ExecutorOutputSchema.optional(),
  reviewer: ReviewerOutputSchema.optional(),
  recovery: RecoveryOutputSchema.optional(),
});

export type RunContractStages = z.infer<typeof RunContractStagesSchema>;

export const RunContractSchema = z.object({
  taskId: z.string().describe('Unique task identifier'),
  projectSlug: z.string().describe('Project identifier'),
  objective: z.string().describe('Task objective'),
  scope: z.array(z.string()).default([]).describe('In-scope items'),
  acceptanceCriteria: z.array(z.string()).default([]).describe('Acceptance criteria'),
  createdAt: z.number().describe('Timestamp of contract creation'),
  stages: RunContractStagesSchema.default({}),
});

export type RunContract = z.infer<typeof RunContractSchema>;

export const RunContract = RunContractSchema;
export const ArchitectOutput = ArchitectOutputSchema;
export const ExecutorOutput = ExecutorOutputSchema;
export const ReviewerOutput = ReviewerOutputSchema;
export const RecoveryOutput = RecoveryOutputSchema;

export function isRunContract(value: unknown): value is RunContract {
  return RunContractSchema.safeParse(value).success;
}

export function isArchitectOutput(value: unknown): value is ArchitectOutput {
  return ArchitectOutputSchema.safeParse(value).success;
}

export function isExecutorOutput(value: unknown): value is ExecutorOutput {
  return ExecutorOutputSchema.safeParse(value).success;
}

export function isReviewerOutput(value: unknown): value is ReviewerOutput {
  return ReviewerOutputSchema.safeParse(value).success;
}

export function isRecoveryOutput(value: unknown): value is RecoveryOutput {
  return RecoveryOutputSchema.safeParse(value).success;
}

export type StageName = 'architect' | 'executor' | 'reviewer' | 'recovery';
