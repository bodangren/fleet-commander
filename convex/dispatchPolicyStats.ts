import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';

const dispatchPolicyStatsEntry = v.object({
  persona: v.string(),
  taskKind: v.string(),
  repoType: v.string(),
  meanDurationMs: v.number(),
  p50Cost: v.number(),
  p90Cost: v.number(),
  reviewFailRate: v.number(),
  retryRate: v.number(),
  blockerCreationRate: v.number(),
  coverageRegressionRate: v.number(),
  sampleCount: v.number(),
  windowDays: v.number(),
  insufficientData: v.boolean(),
  lastUpdatedAt: v.number(),
});

export const upsertDispatchPolicyStats = mutation({
  args: {
    persona: v.string(),
    taskKind: v.string(),
    repoType: v.string(),
    meanDurationMs: v.number(),
    p50Cost: v.number(),
    p90Cost: v.number(),
    reviewFailRate: v.number(),
    retryRate: v.number(),
    blockerCreationRate: v.number(),
    coverageRegressionRate: v.number(),
    sampleCount: v.number(),
    windowDays: v.number(),
    insufficientData: v.boolean(),
    lastUpdatedAt: v.number(),
  },
  returns: dispatchPolicyStatsEntry,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('dispatchPolicyStats')
      .withIndex('by_key', (q) =>
        q.eq('persona', args.persona).eq('taskKind', args.taskKind).eq('repoType', args.repoType),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return { ...existing, ...args };
    }
    await ctx.db.insert('dispatchPolicyStats', args);
    return args;
  },
});

export const getDispatchPolicyStats = query({
  args: {
    persona: v.string(),
    taskKind: v.string(),
    repoType: v.string(),
  },
  returns: v.union(dispatchPolicyStatsEntry, v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('dispatchPolicyStats')
      .withIndex('by_key', (q) =>
        q.eq('persona', args.persona).eq('taskKind', args.taskKind).eq('repoType', args.repoType),
      )
      .first();
    return doc;
  },
});

export const listDispatchPolicyStats = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(dispatchPolicyStatsEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const docs = await ctx.db
      .query('dispatchPolicyStats')
      .withIndex('by_last_updated')
      .order('desc')
      .take(args.limit ?? 100);
    return docs;
  },
});
