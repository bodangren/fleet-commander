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
    let records = await ctx.db.query('coverageRecords').collect();
    records = records.filter((r) => r.projectSlug === args.projectSlug);
    records.sort((a, b) => b.createdAt - a.createdAt);
    return records.slice(0, limit);
  },
});

export const getLatestCoverage = query({
  args: {
    projectSlug: v.string(),
  },
  returns: v.optional(coverageRecordEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const records = await ctx.db
      .query('coverageRecords')
      .filter((r) => r.eq(r.field('projectSlug'), args.projectSlug))
      .collect();
    if (records.length === 0) return null;
    return records.sort((a, b) => b.createdAt - a.createdAt)[0];
  },
});