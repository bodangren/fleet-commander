import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const listProvidersHandler = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('providers'),
      name: v.string(),
      models: v.array(v.string()),
      status: v.string(),
      latency: v.optional(v.number()),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const docs = await ctx.db.query('providers').order('desc').collect();
    return docs.map((doc) => {
      const { _creationTime, ...rest } = doc as any;
      return rest;
    });
  },
});

export const getProviderHandler = query({
  args: { id: v.id('providers') },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('providers'),
      name: v.string(),
      models: v.array(v.string()),
      status: v.string(),
      latency: v.optional(v.number()),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    const { _creationTime, ...rest } = doc as any;
    return rest;
  },
});

export const createProviderHandler = mutation({
  args: {
    name: v.string(),
    models: v.array(v.string()),
    latency: v.optional(v.number()),
  },
  returns: v.id('providers'),
  handler: async (ctx, args) => {
    return ctx.db.insert('providers', {
      name: args.name,
      models: args.models,
      status: 'active',
      createdAt: Date.now(),
      ...(args.latency !== undefined && { latency: args.latency }),
    });
  },
});

export const updateProviderHandler = mutation({
  args: {
    id: v.id('providers'),
    models: v.optional(v.array(v.string())),
    latency: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {};
    if (args.models !== undefined) patch.models = args.models;
    if (args.latency !== undefined) patch.latency = args.latency;
    await ctx.db.patch(args.id, patch);
    return null;
  },
});

export const updateProviderStatusHandler = mutation({
  args: {
    id: v.id('providers'),
    status: v.union(
      v.literal('active'),
      v.literal('rate_limited'),
      v.literal('idle'),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
    return null;
  },
});
