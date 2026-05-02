import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';

const alertType = v.union(
  v.literal('circuit_open'),
  v.literal('stall_detected'),
  v.literal('budget_breach'),
  v.literal('schema_drift'),
  v.literal('health_check_failed'),
);

const alertSeverity = v.union(v.literal('critical'), v.literal('warning'), v.literal('info'));

export const createAlert = mutation({
  args: {
    type: alertType,
    severity: alertSeverity,
    message: v.string(),
    contextJson: v.optional(v.string()),
  },
  returns: v.id('alerts'),
  handler: async (ctx, args) => {
    await resolveActor(ctx);

    // Deduplication: don't create if same type+message unresolved alert exists
    const existing = await ctx.db
      .query('alerts')
      .withIndex('by_type', (q) => q.eq('type', args.type))
      .filter((q) => q.eq(q.field('resolved'), false))
      .filter((q) => q.eq(q.field('message'), args.message))
      .first();

    if (existing) {
      return existing._id;
    }

    return ctx.db.insert('alerts', {
      type: args.type,
      severity: args.severity,
      message: args.message,
      contextJson: args.contextJson ?? '{}',
      resolved: false,
      createdAt: Date.now(),
    });
  },
});

export const resolveAlert = mutation({
  args: { id: v.id('alerts') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    await ctx.db.patch(args.id, { resolved: true, resolvedAt: Date.now() });
    return null;
  },
});

export const listActiveAlerts = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({
    _id: v.id('alerts'),
    type: alertType,
    severity: alertSeverity,
    message: v.string(),
    contextJson: v.string(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    return ctx.db
      .query('alerts')
      .withIndex('by_resolved', (q) => q.eq('resolved', false))
      .order('desc')
      .take(args.limit ?? 50);
  },
});
