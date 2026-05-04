import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { resolveActor } from './lib/auth';
import { aggregateSprintData } from './lib/retrospective';

export const listRetrospectives = query({
  args: {
    projectSlug: v.optional(v.string()),
    sprintId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.string(),
      _creationTime: v.number(),
      sprintId: v.optional(v.string()),
      projectSlug: v.optional(v.string()),
      name: v.string(),
      status: v.string(),
      triggeredBy: v.string(),
      reportMarkdown: v.optional(v.string()),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);

    let retros;
    if (args.sprintId) {
      retros = await ctx.db
        .query('retrospectives')
        .withIndex('by_sprint', (q) => q.eq('sprintId', args.sprintId))
        .collect();
    } else if (args.projectSlug) {
      retros = await ctx.db
        .query('retrospectives')
        .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug))
        .collect();
    } else {
      retros = await ctx.db.query('retrospectives').collect();
    }

    retros.sort((a, b) => b.createdAt - a.createdAt);

    const limit = args.limit ?? 50;
    return retros.slice(0, limit).map((r) => ({
      _id: r._id as string,
      _creationTime: r._creationTime,
      sprintId: r.sprintId,
      projectSlug: r.projectSlug,
      name: r.name,
      status: r.status,
      triggeredBy: r.triggeredBy,
      reportMarkdown: r.reportMarkdown,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
    }));
  },
});

export const getRetrospective = query({
  args: { id: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.string(),
      _creationTime: v.number(),
      sprintId: v.optional(v.string()),
      projectSlug: v.optional(v.string()),
      name: v.string(),
      status: v.string(),
      triggeredBy: v.string(),
      reportMarkdown: v.optional(v.string()),
      aggregatedDataJson: v.optional(v.string()),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db.get(args.id as any) as any;
    if (!doc) return null;
    return {
      _id: doc._id as string,
      _creationTime: doc._creationTime,
      sprintId: doc.sprintId,
      projectSlug: doc.projectSlug,
      name: doc.name,
      status: doc.status,
      triggeredBy: doc.triggeredBy,
      reportMarkdown: doc.reportMarkdown,
      aggregatedDataJson: doc.aggregatedDataJson,
      createdAt: doc.createdAt,
      completedAt: doc.completedAt,
    };
  },
});

export const createRetrospective = mutation({
  args: {
    sprintId: v.optional(v.string()),
    projectSlug: v.optional(v.string()),
    name: v.string(),
    triggeredBy: v.union(v.literal('manual'), v.literal('scheduled')),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const id = await ctx.db.insert('retrospectives', {
      sprintId: args.sprintId,
      projectSlug: args.projectSlug,
      name: args.name,
      status: 'pending',
      triggeredBy: args.triggeredBy,
      createdAt: Date.now(),
    });
    return id as string;
  },
});

export const completeRetrospective = mutation({
  args: {
    id: v.string(),
    reportMarkdown: v.string(),
    aggregatedDataJson: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    await ctx.db.patch(args.id as any, {
      status: 'completed',
      reportMarkdown: args.reportMarkdown,
      aggregatedDataJson: args.aggregatedDataJson,
      completedAt: Date.now(),
    });
    return null;
  },
});

export const failRetrospective = mutation({
  args: {
    id: v.string(),
    reportMarkdown: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    await ctx.db.patch(args.id as any, {
      status: 'failed',
      reportMarkdown: args.reportMarkdown,
      completedAt: Date.now(),
    });
    return null;
  },
});

export const getSprintAggregateData = query({
  args: { sprintId: v.string() },
  returns: v.object({
    sprintName: v.string(),
    projectSlug: v.string(),
    dateRange: v.object({ start: v.string(), end: v.string() }),
    taskCounts: v.object({
      planned: v.number(),
      completed: v.number(),
      blocked: v.number(),
      failed: v.number(),
      carriedOver: v.number(),
    }),
    agentWorkload: v.array(
      v.object({
        agent: v.string(),
        tasksAssigned: v.number(),
        tasksCompleted: v.number(),
        avgDurationMs: v.number(),
      }),
    ),
    issuePatterns: v.array(
      v.object({ pattern: v.string(), count: v.number() }),
    ),
    velocity: v.object({
      planned: v.number(),
      completed: v.number(),
      completionRate: v.number(),
    }),
    hookFailures: v.array(
      v.object({ phase: v.string(), count: v.number() }),
    ),
    sessionMetrics: v.object({
      totalSessions: v.number(),
      resumedSessions: v.number(),
      continuationRate: v.number(),
    }),
    priorityCorrelation: v.array(
      v.object({
        priority: v.string(),
        total: v.number(),
        completed: v.number(),
        completionRate: v.number(),
        avgCycleTimeMs: v.number(),
      }),
    ),
    blockedByChains: v.array(
      v.object({
        taskKey: v.string(),
        blockerCount: v.number(),
        cycleTimeMs: v.union(v.null(), v.number()),
      }),
    ),
    topErrors: v.array(
      v.object({ message: v.string(), count: v.number() }),
    ),
  }),
  handler: async (ctx, args) => {
    await resolveActor(ctx);

    const sprint = await ctx.db.get(args.sprintId as any) as any;
    if (!sprint) {
      throw new Error(`Sprint not found: ${args.sprintId}`);
    }

    const allTasks = await ctx.db.query('tasks').collect();
    const tasks = allTasks.filter((t) =>
      (sprint.taskKeys as string[]).includes(t.taskKey as string),
    );

    const allWorkRuns = await ctx.db.query('workRuns').collect();
    const workRuns = allWorkRuns.filter(
      (r) => r.selectedTaskKey && (sprint.taskKeys as string[]).includes(r.selectedTaskKey as string),
    );

    const allIssues = await ctx.db.query('issues').collect();
    const issues = allIssues.filter(
      (i) => i.projectSlug === sprint.projectSlug,
    );

    const allLogs = await ctx.db.query('executionLogs').collect();
    const logs = allLogs.filter(
      (l) => l.projectSlug === sprint.projectSlug,
    );

    const allErrors = await ctx.db.query('orchestratorErrors').collect();
    const errors = allErrors.filter(
      (e) => e.projectSlug === sprint.projectSlug,
    );

    return aggregateSprintData(
      sprint as any,
      tasks as any,
      workRuns as any,
      issues as any,
      logs as any,
      errors as any,
    );
  },
});
