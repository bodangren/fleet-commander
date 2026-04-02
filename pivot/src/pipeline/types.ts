import { z } from 'zod';

export const ConditionSchema = z.object({
  when: z.string(),
  equals: z.string().optional(),
  exists: z.string().optional(),
});

export type Condition = z.infer<typeof ConditionSchema>;

export const StepSchema = z.object({
  name: z.string().min(1, 'Step name is required'),
  command: z.string().min(1, 'Command is required'),
  env: z.record(z.string()).optional(),
  secrets: z.array(z.string()).optional(),
  condition: ConditionSchema.optional(),
  parallel: z.boolean().optional().default(false),
  depends_on: z.array(z.string()).optional(),
  timeout: z.number().positive().optional().default(300),
});

export type Step = z.infer<typeof StepSchema>;

export const StageSchema = z.object({
  name: z.string().min(1, 'Stage name is required'),
  condition: ConditionSchema.optional(),
  steps: z.array(StepSchema).min(1, 'Stage must have at least one step'),
});

export type Stage = z.infer<typeof StageSchema>;

export const PipelineSchema = z.object({
  name: z.string().min(1, 'Pipeline name is required'),
  trigger: z.enum(['manual', 'task-complete', 'both']).optional().default('manual'),
  stages: z.array(StageSchema).min(1, 'Pipeline must have at least one stage'),
});

export type Pipeline = z.infer<typeof PipelineSchema>;

export const PipelinesFileSchema = z.object({
  pipelines: z.array(PipelineSchema),
});

export type PipelinesFile = z.infer<typeof PipelinesFileSchema>;

export const PipelineExecutionStatus = z.enum([
  'pending',
  'running',
  'succeeded',
  'failed',
  'cancelled',
]);

export type PipelineExecutionStatusType = z.infer<typeof PipelineExecutionStatus>;

export const StepResultSchema = z.object({
  stepName: z.string(),
  status: PipelineExecutionStatus,
  output: z.string().optional(),
  error: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});

export type StepResult = z.infer<typeof StepResultSchema>;

export const StageResultSchema = z.object({
  stageName: z.string(),
  status: PipelineExecutionStatus,
  steps: z.array(StepResultSchema),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});

export type StageResult = z.infer<typeof StageResultSchema>;

export const PipelineExecutionSchema = z.object({
  id: z.string(),
  pipelineName: z.string(),
  projectId: z.string().optional(),
  status: PipelineExecutionStatus,
  stages: z.array(StageResultSchema),
  triggeredBy: z.enum(['manual', 'task-complete']).default('manual'),
  triggeredByTaskId: z.string().optional(),
  envOverride: z.record(z.string()).optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});

export type PipelineExecution = z.infer<typeof PipelineExecutionSchema>;
