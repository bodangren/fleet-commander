import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { orchestratorErrorSeverity } from './lib/validators';

export const logError = mutation({
  args: {
    projectSlug: v.optional(v.string()),
    taskKey: v.optional(v.string()),
    agentId: v.optional(v.string()),
    operation: v.string(),
    severity: orchestratorErrorSeverity,
    message: v.string(),
    errorStack: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('orchestratorErrors', {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const listErrors = query({
  args: {
    startTime: v.number(),
    endTime: v.optional(v.number()),
    severity: v.optional(orchestratorErrorSeverity),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const endTime = args.endTime ?? Date.now();
    const errors = await ctx.db
      .query('orchestratorErrors')
      .withIndex('by_created_at', (q) =>
        q.gte('createdAt', args.startTime).lte('createdAt', endTime),
      )
      .take(args.limit ?? 100);

    if (args.severity) {
      return errors.filter((e) => e.severity === args.severity);
    }
    return errors;
  },
});

export const getRecentErrors = query({
  args: {
    minutes: v.optional(v.number()),
    severity: v.optional(orchestratorErrorSeverity),
  },
  handler: async (ctx, args) => {
    const since = Date.now() - (args.minutes ?? 60) * 60 * 1000;
    const errors = await ctx.db
      .query('orchestratorErrors')
      .withIndex('by_created_at', (q) => q.gte('createdAt', since))
      .take(100);

    if (args.severity) {
      return errors.filter((e) => e.severity === args.severity);
    }
    return errors;
  },
});
