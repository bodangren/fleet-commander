import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { routingPolicy } from './lib/validators';

export const listProjectsHandler = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('projects'),
      name: v.string(),
      slug: v.string(),
      description: v.string(),
      path: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const docs = await ctx.db.query('projects').order('desc').collect();
    return docs.map((doc) => ({
      _id: doc._id,
      name: doc.name,
      slug: doc.slug,
      description: doc.description,
      path: doc.path,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  },
});

export const getProjectHandler = query({
  args: { id: v.id('projects') },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('projects'),
      name: v.string(),
      slug: v.string(),
      description: v.string(),
      path: v.optional(v.string()),
      modelRoutingPolicy: v.optional(routingPolicy),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    return {
      _id: doc._id,
      name: doc.name,
      slug: doc.slug,
      description: doc.description,
      path: doc.path,
      modelRoutingPolicy: doc.modelRoutingPolicy,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  },
});

export const getProjectByNameHandler = query({
  args: { name: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('projects'),
      name: v.string(),
      slug: v.string(),
      description: v.string(),
      path: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query('projects')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .unique();
    if (!doc) return null;
    return {
      _id: doc._id,
      name: doc.name,
      slug: doc.slug,
      description: doc.description,
      path: doc.path,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  },
});

export const createProjectHandler = mutation({
  args: {
    name: v.string(),
    slug: v.optional(v.string()),
    description: v.string(),
    path: v.optional(v.string()),
  },
  returns: v.id('projects'),
  handler: async (ctx, args) => {
    const now = Date.now();
    const slug = args.slug ?? args.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return ctx.db.insert('projects', {
      name: args.name,
      slug,
      description: args.description,
      path: args.path,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateProjectHandler = mutation({
  args: {
    id: v.id('projects'),
    name: v.string(),
    description: v.string(),
    path: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return null;
    await ctx.db.patch(args.id, {
      name: args.name,
      description: args.description,
      path: args.path,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const deleteProjectHandler = mutation({
  args: { id: v.id('projects') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    await ctx.db.delete(args.id);
    return null;
  },
});

async function routingPolicyUpdateHandler(ctx: any, args: any) {
  const existing = await ctx.db.get(args.id);
  if (!existing) return null;
  await ctx.db.patch(args.id, {
    modelRoutingPolicy: args.policy,
    updatedAt: Date.now(),
  });
  return null;
}

export const updateProjectRoutingPolicyHandler = mutation({
  args: {
    id: v.id('projects'),
    policy: routingPolicy,
  },
  returns: v.null(),
  handler: routingPolicyUpdateHandler,
});

export const updateProjectRoutingPolicy = mutation({
  args: {
    id: v.id('projects'),
    policy: routingPolicy,
  },
  returns: v.null(),
  handler: routingPolicyUpdateHandler,
});
