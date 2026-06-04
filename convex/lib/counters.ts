import type { MutationCtx, QueryCtx } from '../_generated/server';

export const COUNTER_KEYS = {
  tasks: 'count:tasks',
  issues: 'count:issues',
  executionLogs: 'count:executionLogs',
  workRuns: 'count:workRuns',
} as const;

export type CounterKey = (typeof COUNTER_KEYS)[keyof typeof COUNTER_KEYS];

/**
 * Reads a denormalized counter from systemMetadata.
 * Returns 0 if the counter row doesn't exist yet.
 * @param ctx - Query context
 * @param key - Counter key in systemMetadata
 * @returns Current count value
 */
export async function getCounter(ctx: QueryCtx, key: string): Promise<number> {
  const row = await ctx.db
    .query('systemMetadata')
    .withIndex('by_key', (q: any) => q.eq('key', key))
    .first();
  if (!row) return 0;
  try {
    return JSON.parse(row.valueJson) as number;
  } catch {
    return 0;
  }
}

/**
 * Increments or decrements a denormalized counter in systemMetadata.
 * Creates the counter row if it doesn't exist.
 * @param ctx - Mutation context
 * @param key - Counter key in systemMetadata
 * @param delta - Amount to change (+1 or -1)
 */
export async function adjustCounter(ctx: MutationCtx, key: string, delta: number): Promise<void> {
  const row = await ctx.db
    .query('systemMetadata')
    .withIndex('by_key', (q) => q.eq('key', key))
    .first();
  const current = row ? (() => { try { return JSON.parse(row.valueJson) as number; } catch { return 0; } })() : 0;
  const next = Math.max(0, current + delta);
  if (row) {
    await ctx.db.patch(row._id, { valueJson: JSON.stringify(next), updatedAt: Date.now() });
  } else {
    await ctx.db.insert('systemMetadata', { key, valueJson: JSON.stringify(next), updatedAt: Date.now() });
  }
}
