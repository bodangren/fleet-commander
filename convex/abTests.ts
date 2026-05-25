import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { abTestStatus, agentRole } from './lib/validators';
import { resolveActor } from './lib/auth';

const abTestResponse = v.object({
  _id: v.id('abTests'),
  name: v.string(),
  agentRole: agentRole,
  controlModel: v.string(),
  treatmentModel: v.string(),
  splitRatio: v.number(),
  status: abTestStatus,
  sprintId: v.optional(v.id('sprints')),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
});

export const listAbTestsHandler = query({
  args: {
    status: v.optional(abTestStatus),
    limit: v.optional(v.number()),
  },
  returns: v.array(abTestResponse),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    let docs = await ctx.db
      .query('abTests')
      .order('desc')
      .collect();

    if (args.status) {
      docs = docs.filter((d) => d.status === args.status);
    }

    if (args.limit != null) {
      docs = docs.slice(0, args.limit);
    }

    return docs.map((doc) => {
      const { _creationTime, ...rest } = doc as any;
      return rest;
    });
  },
});

export const getAbTestHandler = query({
  args: { id: v.id('abTests') },
  returns: v.union(v.null(), abTestResponse),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    const { _creationTime, ...rest } = doc as any;
    return rest;
  },
});

export const createAbTestHandler = mutation({
  args: {
    name: v.string(),
    agentRole: agentRole,
    controlModel: v.string(),
    treatmentModel: v.string(),
    splitRatio: v.number(),
    sprintId: v.optional(v.id('sprints')),
  },
  returns: v.id('abTests'),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const now = Date.now();
    return ctx.db.insert('abTests', {
      name: args.name,
      agentRole: args.agentRole,
      controlModel: args.controlModel,
      treatmentModel: args.treatmentModel,
      splitRatio: args.splitRatio,
      status: 'draft',
      sprintId: args.sprintId,
      createdAt: now,
    });
  },
});

export const updateAbTestStatusHandler = mutation({
  args: {
    id: v.id('abTests'),
    status: abTestStatus,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const patch: Record<string, unknown> = { status: args.status };
    if (args.status === 'completed') {
      patch.completedAt = Date.now();
    }
    await ctx.db.patch(args.id, patch);
    return null;
  },
});

export const deleteAbTestHandler = mutation({
  args: { id: v.id('abTests') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    await ctx.db.delete(args.id);
    return null;
  },
});
