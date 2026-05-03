import { v } from 'convex/values';
import { query } from './_generated/server';
import { resolveActor } from './lib/auth';
import {
  bucketCompletionTrends,
  bucketAgentUtilization,
  computeBottlenecks,
  bucketQueueDepth,
  computeHookMetrics,
  computeSessionMetrics,
  filterTasksForAnalytics,
  filterWorkRunsForAnalytics,
} from './lib/analytics';

const MS_PER_DAY = 86400000;

export const getCompletionTrends = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
    trackId: v.optional(v.string()),
    agent: v.optional(v.string()),
    priority: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      date: v.string(),
      completed: v.number(),
      failed: v.number(),
      created: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const days = args.days ?? 30;
    const now = Date.now();
    const cutoff = now - days * MS_PER_DAY;

    let tasksQuery = ctx.db.query('tasks').withIndex('by_updated_at', (q) => q.gte('updatedAt', cutoff));
    if (args.projectSlug) {
      tasksQuery = ctx.db.query('tasks').withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug!)).filter((q) => q.gte(q.field('updatedAt'), cutoff));
    }

    const tasks = filterTasksForAnalytics(await tasksQuery.collect(), {
      agent: args.agent,
      priority: args.priority,
    });
    return bucketCompletionTrends(tasks, now, days);
  },
});

export const getAgentUtilization = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
    agent: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      agent: v.string(),
      date: v.string(),
      activeTasks: v.number(),
      completedTasks: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const days = args.days ?? 30;
    const now = Date.now();
    const cutoff = now - days * MS_PER_DAY;

    let workQuery = ctx.db.query('workRuns').withIndex('by_started_at', (q) => q.gte('startedAt', cutoff));
    if (args.projectSlug) {
      workQuery = ctx.db.query('workRuns').withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug!)).filter((q) => q.gte(q.field('startedAt'), cutoff));
    }

    const workRuns = filterWorkRunsForAnalytics(await workQuery.collect(), {
      agent: args.agent,
    });
    return bucketAgentUtilization(workRuns);
  },
});

export const getBottlenecks = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
    agent: v.optional(v.string()),
    priority: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      trackId: v.string(),
      projectSlug: v.string(),
      totalTasks: v.number(),
      failedTasks: v.number(),
      avgDurationMs: v.number(),
      failureRate: v.number(),
      lastActivityAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const days = args.days ?? 30;
    const now = Date.now();
    const cutoff = now - days * MS_PER_DAY;

    let tasksQuery = ctx.db.query('tasks').withIndex('by_updated_at', (q) => q.gte('updatedAt', cutoff));
    if (args.projectSlug) {
      tasksQuery = ctx.db.query('tasks').withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug!)).filter((q) => q.gte(q.field('updatedAt'), cutoff));
    }

    const tasks = filterTasksForAnalytics(await tasksQuery.collect(), {
      agent: args.agent,
      priority: args.priority,
    });
    return computeBottlenecks(tasks);
  },
});

export const getQueueDepth = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
    agent: v.optional(v.string()),
    priority: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      date: v.string(),
      pending: v.number(),
      inProgress: v.number(),
      completed: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const days = args.days ?? 30;
    const now = Date.now();
    const cutoff = now - days * MS_PER_DAY;

    let tasksQuery = ctx.db.query('tasks').withIndex('by_updated_at', (q) => q.gte('updatedAt', cutoff));
    if (args.projectSlug) {
      tasksQuery = ctx.db.query('tasks').withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug!)).filter((q) => q.gte(q.field('updatedAt'), cutoff));
    }

    const tasks = filterTasksForAnalytics(await tasksQuery.collect(), {
      agent: args.agent,
      priority: args.priority,
    });
    return bucketQueueDepth(tasks, now, days);
  },
});

export const getHookMetrics = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      date: v.string(),
      phase: v.string(),
      executions: v.number(),
      failures: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const days = args.days ?? 30;
    const now = Date.now();
    const cutoff = now - days * MS_PER_DAY;

    const errors = await ctx.db
      .query('orchestratorErrors')
      .withIndex('by_created_at', (q) => q.gte('createdAt', cutoff))
      .collect();

    const filtered = args.projectSlug
      ? errors.filter((e) => e.projectSlug === args.projectSlug)
      : errors;

    return computeHookMetrics(filtered, now, days);
  },
});

export const getSessionMetrics = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
    agent: v.optional(v.string()),
    priority: v.optional(v.string()),
  },
  returns: v.object({
    totalTasks: v.number(),
    sessionBoundTasks: v.number(),
    resumptionRate: v.number(),
    activeSessions: v.number(),
    byDate: v.array(
      v.object({
        date: v.string(),
        newSessions: v.number(),
        resumedSessions: v.number(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const days = args.days ?? 30;
    const now = Date.now();
    const cutoff = now - days * MS_PER_DAY;

    let tasksQuery = ctx.db
      .query('tasks')
      .withIndex('by_updated_at', (q) => q.gte('updatedAt', cutoff));
    if (args.projectSlug) {
      tasksQuery = ctx.db
        .query('tasks')
        .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug!))
        .filter((q) => q.gte(q.field('updatedAt'), cutoff));
    }

    const tasks = filterTasksForAnalytics(await tasksQuery.collect(), {
      agent: args.agent,
      priority: args.priority,
    });
    return computeSessionMetrics(tasks, now, days);
  },
});
