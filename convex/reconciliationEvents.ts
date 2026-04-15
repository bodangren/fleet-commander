import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';

const reconciliationEventEntry = v.object({
  projectSlug: v.string(),
  artifactType: v.union(v.literal('track'), v.literal('task'), v.literal('issue')),
  artifactId: v.string(),
  divergenceType: v.union(v.literal('added'), v.literal('modified'), v.literal('deleted')),
  conductorHash: v.string(),
  canonicalHash: v.string(),
  description: v.string(),
  counter: v.number(),
  createdAt: v.number(),
});

export const recordDivergence = mutation({
  args: {
    projectSlug: v.string(),
    artifactType: v.union(v.literal('track'), v.literal('task'), v.literal('issue')),
    artifactId: v.string(),
    divergenceType: v.union(v.literal('added'), v.literal('modified'), v.literal('deleted')),
    conductorHash: v.string(),
    canonicalHash: v.string(),
    description: v.string(),
  },
  returns: reconciliationEventEntry,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query('reconciliationEvents')
      .withIndex('by_artifact', (q) =>
        q.eq('artifactType', args.artifactType).eq('artifactId', args.artifactId)
      )
      .first();

    if (existing) {
      if (existing.conductorHash === args.conductorHash && existing.canonicalHash === args.canonicalHash) {
        return existing;
      }
      await ctx.db.patch(existing._id, {
        conductorHash: args.conductorHash,
        canonicalHash: args.canonicalHash,
        divergenceType: args.divergenceType,
        description: args.description,
        counter: existing.counter + 1,
      });
      return { ...existing, conductorHash: args.conductorHash, canonicalHash: args.canonicalHash, divergenceType: args.divergenceType, description: args.description, counter: existing.counter + 1 };
    }

    const entry = {
      projectSlug: args.projectSlug,
      artifactType: args.artifactType,
      artifactId: args.artifactId,
      divergenceType: args.divergenceType,
      conductorHash: args.conductorHash,
      canonicalHash: args.canonicalHash,
      description: args.description,
      counter: 1,
      createdAt: now,
    };

    await ctx.db.insert('reconciliationEvents', entry);
    return entry;
  },
});

export const listRecent = query({
  args: {
    projectSlug: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(reconciliationEventEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const docs = await ctx.db
      .query('reconciliationEvents')
      .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug))
      .order('desc')
      .take(args.limit ?? 50);
    return docs;
  },
});

export const getDivergences = query({
  args: {
    projectSlug: v.string(),
    artifactType: v.optional(v.union(v.literal('track'), v.literal('task'), v.literal('issue'))),
  },
  returns: v.array(reconciliationEventEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    if (args.artifactType) {
      const docs = await ctx.db
        .query('reconciliationEvents')
        .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug))
        .filter((q) => q.eq(q.field('artifactType'), args.artifactType!))
        .take(100);
      return docs;
    }
    const docs = await ctx.db
      .query('reconciliationEvents')
      .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug))
      .order('desc')
      .take(100);
    return docs;
  },
});