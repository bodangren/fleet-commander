import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';

const policyWeightsEntry = v.object({
  name: v.string(),
  weightsJson: v.string(),
  version: v.number(),
  createdAt: v.number(),
});

export const getPolicyWeights = query({
  args: { name: v.string() },
  returns: v.union(policyWeightsEntry, v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('policyWeights')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .order('desc')
      .first();
    if (!doc) return null;
    return {
      name: doc.name,
      weightsJson: doc.weightsJson,
      version: doc.version,
      createdAt: doc.createdAt,
    };
  },
});

export const listPolicyWeights = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(policyWeightsEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const docs = await ctx.db
      .query('policyWeights')
      .withIndex('by_version')
      .order('desc')
      .take(args.limit ?? 100);
    return docs.map((doc) => ({
      name: doc.name,
      weightsJson: doc.weightsJson,
      version: doc.version,
      createdAt: doc.createdAt,
    }));
  },
});

export const upsertPolicyWeights = mutation({
  args: {
    name: v.string(),
    weightsJson: v.string(),
  },
  returns: policyWeightsEntry,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('policyWeights')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .order('desc')
      .first();
    const nextVersion = existing ? existing.version + 1 : 1;
    const now = Date.now();
    const entry = {
      name: args.name,
      weightsJson: args.weightsJson,
      version: nextVersion,
      createdAt: now,
    };
    await ctx.db.insert('policyWeights', entry);
    return entry;
  },
});
