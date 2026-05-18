import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const listSprintsHandler = query({
  args: { projectId: v.id('projects') },
  returns: v.array(
    v.object({
      _id: v.id('sprints'),
      projectId: v.id('projects'),
      name: v.string(),
      status: v.string(),
      budget: v.number(),
      actualCost: v.number(),
      pointsDelivered: v.number(),
      taskCount: v.number(),
      completedCount: v.number(),
      createdAt: v.number(),
      startedAt: v.optional(v.number()),
      closedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query('sprints')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .collect();
    return docs.map((doc) => {
      const { _creationTime, ...rest } = doc as any;
      return rest;
    });
  },
});

export const getSprintHandler = query({
  args: { id: v.id('sprints') },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('sprints'),
      projectId: v.id('projects'),
      name: v.string(),
      status: v.string(),
      budget: v.number(),
      actualCost: v.number(),
      pointsDelivered: v.number(),
      taskCount: v.number(),
      completedCount: v.number(),
      createdAt: v.number(),
      startedAt: v.optional(v.number()),
      closedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    const { _creationTime, ...rest } = doc as any;
    return rest;
  },
});

export const createSprintHandler = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.string(),
    budget: v.number(),
  },
  returns: v.id('sprints'),
  handler: async (ctx, args) => {
    return ctx.db.insert('sprints', {
      projectId: args.projectId,
      name: args.name,
      status: 'planned',
      budget: args.budget,
      actualCost: 0,
      pointsDelivered: 0,
      taskCount: 0,
      completedCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const updateSprintStatusHandler = mutation({
  args: {
    id: v.id('sprints'),
    status: v.union(
      v.literal('planned'),
      v.literal('active'),
      v.literal('closed'),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status };
    if (args.status === 'active') {
      patch.startedAt = Date.now();
    }
    await ctx.db.patch(args.id, patch);
    return null;
  },
});

export const closeSprintHandler = mutation({
  args: { id: v.id('sprints') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sprint = await ctx.db.get(args.id);
    if (!sprint) throw new Error('Sprint not found');

    const tasks = await ctx.db
      .query('tasks')
      .withIndex('by_project', (q) => q.eq('projectId', sprint.projectId))
      .collect();

    const sprintTasks = tasks.filter((t: any) => t.sprintId === args.id);
    if (sprintTasks.length === 0) {
      throw new Error('No tasks in sprint');
    }

    const actualCost = sprintTasks.reduce(
      (sum: number, t: any) => sum + (t.actualCost ?? 0),
      0
    );
    const pointsDelivered = sprintTasks.reduce(
      (sum: number, t: any) =>
        sum + (t.status === 'done' ? t.storyPoints : 0),
      0
    );
    const completedCount = sprintTasks.filter(
      (t: any) => t.status === 'done'
    ).length;

    await ctx.db.patch(args.id, {
      status: 'closed',
      actualCost,
      pointsDelivered,
      taskCount: sprintTasks.length,
      completedCount,
      closedAt: Date.now(),
    });
    return null;
  },
});

export const getSprintBudgetHandler = query({
  args: { id: v.id('sprints') },
  returns: v.object({
    totalEstimate: v.number(),
    budget: v.number(),
    remaining: v.number(),
  }),
  handler: async (ctx, args) => {
    const sprint = await ctx.db.get(args.id);
    if (!sprint) throw new Error('Sprint not found');

    const tasks = await ctx.db
      .query('tasks')
      .withIndex('by_project', (q) => q.eq('projectId', sprint.projectId))
      .collect();

    const sprintTasks = tasks.filter((t: any) => t.sprintId === args.id);
    const totalEstimate = sprintTasks.reduce(
      (sum: number, t: any) => sum + (t.costEstimate ?? 0),
      0
    );

    return {
      totalEstimate,
      budget: sprint.budget,
      remaining: sprint.budget - totalEstimate,
    };
  },
});
