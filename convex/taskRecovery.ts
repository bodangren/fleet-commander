import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { resolveActor } from './lib/auth';

export const incrementTaskRetryCount = mutation({
  args: {
    projectSlug: v.string(),
    trackId: v.string(),
    taskKey: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const task = await ctx.db
      .query('tasks')
      .withIndex('by_project_and_track', (q) =>
        q.eq('projectSlug', args.projectSlug).eq('trackId', args.trackId),
      )
      .filter((q) => q.eq(q.field('taskKey'), args.taskKey))
      .unique();

    if (!task) return 0;

    const currentRetry = task.retryCount ?? 0;
    const newRetry = currentRetry + 1;

    await ctx.db.patch(task._id, {
      retryCount: newRetry,
      updatedAt: Date.now(),
    });

    return newRetry;
  },
});

export const setTaskStartedAt = mutation({
  args: {
    projectSlug: v.string(),
    trackId: v.string(),
    taskKey: v.string(),
    startedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const task = await ctx.db
      .query('tasks')
      .withIndex('by_project_and_track', (q) =>
        q.eq('projectSlug', args.projectSlug).eq('trackId', args.trackId),
      )
      .filter((q) => q.eq(q.field('taskKey'), args.taskKey))
      .unique();

    if (!task) return null;

    await ctx.db.patch(task._id, {
      startedAt: args.startedAt,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const markTaskBlocked = mutation({
  args: {
    projectSlug: v.string(),
    trackId: v.string(),
    taskKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const task = await ctx.db
      .query('tasks')
      .withIndex('by_project_and_track', (q) =>
        q.eq('projectSlug', args.projectSlug).eq('trackId', args.trackId),
      )
      .filter((q) => q.eq(q.field('taskKey'), args.taskKey))
      .unique();

    if (!task) return null;

    await ctx.db.patch(task._id, {
      status: 'blocked',
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const getInProgressTasks = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('tasks'),
      projectSlug: v.string(),
      trackId: v.string(),
      taskKey: v.string(),
      title: v.string(),
      status: v.string(),
      assignee: v.optional(v.string()),
      dependencies: v.array(v.string()),
      updatedAt: v.number(),
      retryCount: v.optional(v.number()),
      startedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx) => {
    await resolveActor(ctx);
    const tasks = await ctx.db.query('tasks').collect();
    return tasks
      .filter((t) => t.status === 'in_progress')
      .map((t) => ({
        _id: t._id,
        projectSlug: t.projectSlug,
        trackId: t.trackId,
        taskKey: t.taskKey,
        title: t.title,
        status: t.status,
        assignee: t.assignee,
        dependencies: t.dependencies,
        updatedAt: t.updatedAt,
        retryCount: t.retryCount,
        startedAt: t.startedAt,
      }));
  },
});
