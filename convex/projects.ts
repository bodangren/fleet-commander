import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';
import { projectStatus, sourceKind } from './lib/validators';

const projectResponse = v.object({
  slug: v.string(),
  name: v.string(),
  rootPath: v.string(),
  status: projectStatus,
  source: sourceKind,
  updatedAt: v.number(),
  lastSyncedAt: v.optional(v.number()),
});

export const listProjects = query({
  args: {},
  returns: v.array(projectResponse),
  handler: async (ctx) => {
    await resolveActor(ctx);
    const docs = await ctx.db.query('projects').order('desc').collect();
    return docs.map((doc) => ({
      slug: doc.slug,
      name: doc.name,
      rootPath: doc.rootPath,
      status: doc.status,
      source: doc.source,
      updatedAt: doc.updatedAt,
      lastSyncedAt: doc.lastSyncedAt,
    }));
  },
});

export const getProjectBySlug = query({
  args: { slug: v.string() },
  returns: v.union(projectResponse, v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();

    if (!doc) {
      return null;
    }

    return {
      slug: doc.slug,
      name: doc.name,
      rootPath: doc.rootPath,
      status: doc.status,
      source: doc.source,
      updatedAt: doc.updatedAt,
      lastSyncedAt: doc.lastSyncedAt,
    };
  },
});

export const upsertProject = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    rootPath: v.string(),
    status: v.optional(projectStatus),
    source: v.optional(sourceKind),
  },
  returns: projectResponse,
  handler: async (ctx, args) => {
    const actor = await resolveActor(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();

    const next = {
      slug: args.slug,
      name: args.name,
      rootPath: args.rootPath,
      status: args.status ?? 'active',
      source: args.source ?? 'manual',
      updatedAt: now,
      lastSyncedAt: now,
    } as const;

    if (existing) {
      await ctx.db.patch(existing._id, next);
    } else {
      await ctx.db.insert('projects', {
        ...next,
        createdAt: now,
      });
    }

    return {
      ...next,
      // Preserve explicit write boundary metadata in logs later.
      source: actor.isAuthenticated ? next.source : 'manual',
    };
  },
});
