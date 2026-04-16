import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';

const harnessReliabilityStatsEntry = v.object({
  harnessName: v.string(),
  successRate7d: v.number(),
  medianLatencyMs: v.number(),
  averageTokens: v.number(),
  reviewPassRateByTaskClassJson: v.string(),
  topFailureModesJson: v.string(),
  lastUpdatedAt: v.number(),
});

export const upsertHarnessReliabilityStats = mutation({
  args: {
    harnessName: v.string(),
    successRate7d: v.number(),
    medianLatencyMs: v.number(),
    averageTokens: v.number(),
    reviewPassRateByTaskClassJson: v.string(),
    topFailureModesJson: v.string(),
    lastUpdatedAt: v.number(),
  },
  returns: harnessReliabilityStatsEntry,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('harnessReliabilityStats')
      .withIndex('by_name', (q) => q.eq('harnessName', args.harnessName))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return { ...existing, ...args };
    }
    await ctx.db.insert('harnessReliabilityStats', args);
    return args;
  },
});

export const getHarnessReliabilityStats = query({
  args: { harnessName: v.string() },
  returns: v.union(harnessReliabilityStatsEntry, v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('harnessReliabilityStats')
      .withIndex('by_name', (q) => q.eq('harnessName', args.harnessName))
      .first();
    return doc;
  },
});

export const listHarnessReliabilityStats = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(harnessReliabilityStatsEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const docs = await ctx.db
      .query('harnessReliabilityStats')
      .withIndex('by_last_updated')
      .order('desc')
      .take(args.limit ?? 100);
    return docs;
  },
});
