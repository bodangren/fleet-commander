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
  handler: async (_ctx, _args) => {
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
  handler: async (_ctx, _args) => {
    return [];
  },
});
