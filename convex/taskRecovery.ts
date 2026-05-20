import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';

export const incrementTaskRetryCount = mutation({
  args: {
    projectSlug: v.string(),
    trackId: v.string(),
    taskKey: v.string(),
  },
  returns: v.number(),
  handler: async (_ctx, _args) => {
    return 0;
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
  handler: async (_ctx, _args) => {
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
  handler: async (_ctx, _args) => {
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
    const tasks = await ctx.db
      .query('tasks')
      .withIndex('by_status', (q) => q.eq('status', 'in_progress'))
      .collect();
    return tasks.map((t: any) => ({
      _id: t._id,
      projectSlug: '',
      trackId: '',
      taskKey: t._id,
      title: t.title,
      status: t.status,
      assignee: t.assigneeId,
      dependencies: [],
      updatedAt: t.updatedAt,
      retryCount: 0,
      startedAt: undefined,
    }));
  },
});
