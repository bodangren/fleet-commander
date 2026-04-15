import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';

const coverageRecordEntry = v.object({
  projectSlug: v.string(),
  projectId: v.string(),
  percentage: v.number(),
  tool: v.string(),
  executionId: v.optional(v.string()),
  createdAt: v.number(),
});

export const storeCoverageRecord = mutation({
  args: {
    projectSlug: v.string(),
    projectId: v.string(),
    percentage: v.number(),
    tool: v.string(),
    executionId: v.optional(v.string()),
  },
  returns: coverageRecordEntry,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const record = {
      projectSlug: args.projectSlug,
      projectId: args.projectId,
      percentage: args.percentage,
      tool: args.tool,
      executionId: args.executionId,
      createdAt: Date.now(),
    };

    await ctx.db.insert('coverageRecords', record);
    return record;
  },
});

export const getCoverageHistory = query({
  args: {
    projectSlug: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(coverageRecordEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const limit = args.limit ?? 50;
    const records = await ctx.db
      .query('coverageRecords')
      .withIndex('by_project_and_date', (q) =>
        q.eq('projectSlug', args.projectSlug)
      )
      .order('desc')
      .take(limit);
    return records;
  },
});

export const getLatestCoverage = query({
  args: {
    projectSlug: v.string(),
  },
  returns: v.union(v.null(), coverageRecordEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const record = await ctx.db
      .query('coverageRecords')
      .withIndex('by_project_and_date', (q) =>
        q.eq('projectSlug', args.projectSlug)
      )
      .order('desc')
      .first();
    return record ?? null;
  },
});