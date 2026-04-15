import { z } from 'zod';

export const TaskClassSchema = z.enum(['feature', 'bug', 'chore', 'review']);

export const InvocationTemplateSchema = z.object({
  template: z.string().describe('Invocation template with {model} and {prompt} placeholders'),
  flags: z
    .record(z.string(), z.string())
    .default({})
    .describe('Named flags with {value} placeholder for parameterized flags'),
});

export type InvocationTemplate = z.infer<typeof InvocationTemplateSchema>;

export const DiscoverySchema = z.object({
  command: z.string().describe('Command to discover available models'),
  parse_strategy: z.enum(['line-per-model', 'json', 'key-value']).default('line-per-model'),
  pattern: z.string().default('').describe('Optional regex pattern to extract model names'),
  notes: z.string().optional().describe('Additional notes about discovery'),
});

export type Discovery = z.infer<typeof DiscoverySchema>;

export const CapabilitySchema = z.object({
  supportedTaskClasses: z
    .array(TaskClassSchema)
    .default(['feature'])
    .describe('Task classes this harness can handle'),
  supportsContinuousMode: z.boolean().default(false).describe('Whether harness supports continuous mode'),
  maxConcurrentTasks: z.number().int().min(1).default(1).describe('Max concurrent tasks'),
  supportedLlmProviders: z.array(z.string()).default([]).describe('LLM providers supported'),
});

export type Capability = z.infer<typeof CapabilitySchema>;

export const PolicySchema = z.object({
  allowed_task_classes: z.array(TaskClassSchema).default([]).describe('Task classes allowed'),
  concurrency_limit: z.number().int().min(1).default(1).describe('Concurrency limit'),
  retry_with_human_review_on_failure: z.boolean().default(false),
});

export type Policy = z.infer<typeof PolicySchema>;

export const HarnessProfileSchema = z.object({
  name: z.string().describe('Unique harness identifier'),
  binary: z.string().describe('Binary name or path'),
  discovery: DiscoverySchema.optional().describe('Model discovery configuration'),
  invocation: InvocationTemplateSchema.describe('How to invoke the harness'),
  capabilities: CapabilitySchema.optional().describe('Harness capabilities'),
  policy: PolicySchema.optional().describe('Execution policy constraints'),
});

export type HarnessProfile = z.infer<typeof HarnessProfileSchema>;

export const HarnessProfile = HarnessProfileSchema;

export function isHarnessProfile(value: unknown): value is HarnessProfile {
  return HarnessProfileSchema.safeParse(value).success;
}