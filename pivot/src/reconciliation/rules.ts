import { z } from 'zod';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';

const ConflictStrategySchema = z.enum([
  'reject',
  'prefer_canonical',
  'prefer_export',
  'manual',
]);

const CanonicalSourceSchema = z.enum(['convex', 'markdown']);

const ArtifactClassRuleSchema = z.object({
  canonicalSource: CanonicalSourceSchema,
  exportTarget: z.string().nullable(),
  importAllowed: z.array(z.string()),
  conflictStrategy: ConflictStrategySchema,
});

export const ReconciliationRulesSchema = z.object({
  artifactClasses: z.record(z.string(), ArtifactClassRuleSchema),
});

export type ReconciliationRules = z.infer<typeof ReconciliationRulesSchema>;
export type ConflictStrategy = z.infer<typeof ConflictStrategySchema>;
export type CanonicalSource = z.infer<typeof CanonicalSourceSchema>;

export function parseReconciliationRules(filePath: string): ReconciliationRules {
  const content = readFileSync(filePath, 'utf-8');
  const parsed = yaml.load(content) as Record<string, unknown>;
  return ReconciliationRulesSchema.parse(parsed);
}