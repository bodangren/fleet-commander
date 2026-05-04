import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';

export const listSprints = query({
  args: { projectSlug: v.string() },
  returns: v.array(
    v.object({
      _id: v.id('sprints'),
      projectSlug: v.string(),
      name: v.string(),
      status: v.string(),
      startDate: v.number(),
      endDate: v.number(),
      goal: v.optional(v.string()),
      taskKeys: v.array(v.string()),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const docs = await ctx.db
      .query('sprints')
      .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug))
      .order('desc')
      .collect();
    return docs.map((doc) => ({
      _id: doc._id,
      projectSlug: doc.projectSlug,
      name: doc.name,
      status: doc.status,
      startDate: doc.startDate,
      endDate: doc.endDate,
      goal: doc.goal,
      taskKeys: doc.taskKeys,
      updatedAt: doc.updatedAt,
    }));
  },
});

export const getSprintById = query({
  args: { id: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('sprints'),
      projectSlug: v.string(),
      name: v.string(),
      status: v.string(),
      startDate: v.number(),
      endDate: v.number(),
      goal: v.optional(v.string()),
      taskKeys: v.array(v.string()),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db.get(args.id as any) as any;
    if (!doc) return null;
    return {
      _id: doc._id,
      projectSlug: doc.projectSlug,
      name: doc.name,
      status: doc.status,
      startDate: doc.startDate,
      endDate: doc.endDate,
      goal: doc.goal,
      taskKeys: doc.taskKeys,
      updatedAt: doc.updatedAt,
    };
  },
});

export const createSprint = mutation({
  args: {
    projectSlug: v.string(),
    name: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    goal: v.optional(v.string()),
    taskKeys: v.optional(v.array(v.string())),
  },
  returns: v.id('sprints'),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    return ctx.db.insert('sprints', {
      projectSlug: args.projectSlug,
      name: args.name,
      status: 'planning',
      startDate: args.startDate,
      endDate: args.endDate,
      goal: args.goal,
      taskKeys: args.taskKeys ?? [],
      updatedAt: Date.now(),
    });
  },
});

export const updateSprint = mutation({
  args: {
    sprintId: v.id('sprints'),
    name: v.optional(v.string()),
    status: v.optional(v.string()),
    goal: v.optional(v.string()),
    taskKeys: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const { sprintId, ...updates } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(sprintId, patch);
    return null;
  },
});
