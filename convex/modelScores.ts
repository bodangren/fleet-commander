import { v } from 'convex/values';
import { query } from './_generated/server';
import type { QueryCtx } from './_generated/server';

/**
 * Returns aggregated model performance scores for a project.
 * Aggregates from runContracts by (model, role, taskType) to feed the model router.
 *
 * @param ctx - Query context
 * @param args - Object containing projectSlug
 * @returns Array of model score records with cost, quality, and speed metrics
 */
export async function getModelScoresHandler(
  ctx: QueryCtx,
  args: { projectSlug: string },
) {
  const records = await ctx.db
    .query('runContracts')
    .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug))
    .collect();

  const buckets = new Map<
    string,
    {
      model: string;
      role: string;
      taskType: string;
      totalCost: number;
      costCount: number;
      rejectedCount: number;
      reviewerCount: number;
      sampleCount: number;
    }
  >();

  for (const record of records) {
    const model = record.harnessName ?? 'opencode';
    const role = derivePersona(record);
    const taskType = deriveTaskKind(record.taskId);
    const key = `${model}::${role}::${taskType}`;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        model,
        role,
        taskType,
        totalCost: 0,
        costCount: 0,
        rejectedCount: 0,
        reviewerCount: 0,
        sampleCount: 0,
      };
      buckets.set(key, bucket);
    }

    bucket.sampleCount++;

    if (record.actualCost !== undefined && record.actualCost >= 0) {
      bucket.totalCost += record.actualCost;
      bucket.costCount++;
    }

    if (record.reviewerStatus) {
      bucket.reviewerCount++;
      if (record.reviewerStatus === 'failed') {
        bucket.rejectedCount++;
      }
    }
  }

  const results = [];
  for (const bucket of buckets.values()) {
    results.push({
      model: bucket.model,
      role: bucket.role,
      taskType: bucket.taskType,
      sampleCount: bucket.sampleCount,
      avgCostPerPoint: bucket.costCount > 0 ? bucket.totalCost / bucket.costCount : 0,
      rejectionRate: bucket.reviewerCount > 0 ? bucket.rejectedCount / bucket.reviewerCount : 0,
      avgDurationMs: 0, // Duration not available in runContracts
    });
  }

  return results;
}

export const getModelScores = query({
  args: { projectSlug: v.string() },
  returns: v.array(
    v.object({
      model: v.string(),
      role: v.string(),
      taskType: v.string(),
      sampleCount: v.number(),
      avgCostPerPoint: v.number(),
      rejectionRate: v.number(),
      avgDurationMs: v.number(),
    }),
  ),
  handler: getModelScoresHandler,
});

function derivePersona(record: {
  recoveryAction?: string;
  reviewerStatus?: string;
  executorStatus?: string;
  architectOutput?: string;
}): 'architect' | 'executor' | 'reviewer' | 'recovery' {
  if (record.recoveryAction) return 'recovery';
  if (record.reviewerStatus) return 'reviewer';
  if (record.executorStatus) return 'executor';
  if (record.architectOutput) return 'architect';
  return 'executor';
}

function deriveTaskKind(taskId: string): string {
  const lower = taskId.toLowerCase();
  if (lower.includes('bug') || lower.includes('fix')) return 'bug';
  if (lower.includes('chore') || lower.includes('cleanup') || lower.includes('maintenance'))
    return 'chore';
  if (lower.includes('review')) return 'review';
  return 'feature';
}
