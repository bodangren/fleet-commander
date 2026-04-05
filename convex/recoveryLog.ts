import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';

export const logRecoveryEvent = mutation({
  args: {
    taskId: v.string(),
    agentId: v.string(),
    eventType: v.union(
      v.literal('stalled'),
      v.literal('retry'),
      v.literal('circuit-open'),
      v.literal('circuit-reset'),
      v.literal('recovered'),
      v.literal('blocked'),
    ),
    details: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    await ctx.db.insert('recoveryLog', {
      taskId: args.taskId,
      agentId: args.agentId,
      eventType: args.eventType,
      timestamp: Date.now(),
      details: args.details,
    });
    return null;
  },
});

export const getRecoveryEvents = query({
  args: {
    taskId: v.optional(v.string()),
    agentId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id('recoveryLog'),
      taskId: v.string(),
      agentId: v.string(),
      eventType: v.union(
        v.literal('stalled'),
        v.literal('retry'),
        v.literal('circuit-open'),
        v.literal('circuit-reset'),
        v.literal('recovered'),
        v.literal('blocked'),
      ),
      timestamp: v.number(),
      details: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    let results;
    if (args.taskId) {
      results = await ctx.db
        .query('recoveryLog')
        .withIndex('by_task_id', (q) => q.eq('taskId', args.taskId as string))
        .order('desc')
        .take(args.limit ?? 50);
    } else if (args.agentId) {
      results = await ctx.db
        .query('recoveryLog')
        .withIndex('by_agent_id', (q) => q.eq('agentId', args.agentId as string))
        .order('desc')
        .take(args.limit ?? 50);
    } else {
      results = await ctx.db
        .query('recoveryLog')
        .order('desc')
        .take(args.limit ?? 50);
    }

    return results.map((doc) => ({
      _id: doc._id,
      taskId: doc.taskId,
      agentId: doc.agentId,
      eventType: doc.eventType,
      timestamp: doc.timestamp,
      details: doc.details,
    }));
  },
});

export const getRecoveryStats = query({
  args: {},
  returns: v.object({
    totalEvents: v.number(),
    stalledCount: v.number(),
    retryCount: v.number(),
    circuitOpenCount: v.number(),
    recoveredCount: v.number(),
    blockedCount: v.number(),
  }),
  handler: async (ctx) => {
    await resolveActor(ctx);
    const all = await ctx.db.query('recoveryLog').collect();

    let stalledCount = 0;
    let retryCount = 0;
    let circuitOpenCount = 0;
    let recoveredCount = 0;
    let blockedCount = 0;

    for (const event of all) {
      switch (event.eventType) {
        case 'stalled':
          stalledCount++;
          break;
        case 'retry':
          retryCount++;
          break;
        case 'circuit-open':
          circuitOpenCount++;
          break;
        case 'recovered':
          recoveredCount++;
          break;
        case 'blocked':
          blockedCount++;
          break;
      }
    }

    return {
      totalEvents: all.length,
      stalledCount,
      retryCount,
      circuitOpenCount,
      recoveredCount,
      blockedCount,
    };
  },
});
