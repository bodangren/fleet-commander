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
  handler: async (_ctx) => {
    return [];
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
  handler: async (_ctx, _args) => {
    return null;
  },
});

export const createProviderHandler = mutation({
  args: {
    name: v.string(),
    models: v.array(v.string()),
    latency: v.optional(v.number()),
  },
  returns: v.id('providers'),
  handler: async (_ctx, _args) => {
    return 'provider-1' as any;
  },
});

export const updateProviderHandler = mutation({
  args: {
    id: v.id('providers'),
    models: v.optional(v.array(v.string())),
    latency: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (_ctx, _args) => {
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
  handler: async (_ctx, _args) => {
    return null;
  },
});
