import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { resolveActor } from './lib/auth';
import { aggregateSprintData } from './lib/retrospective';
import { retrospectiveTriggeredBy } from './lib/validators';

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
      _id: r._id as string, // Convex Id<string> → string for v.string() returns schema
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
  args: { id: v.id('retrospectives') },
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
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    return {
      _id: doc._id,
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
    triggeredBy: retrospectiveTriggeredBy,
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
    return id as string; // Convex Id<string> → string for v.string() returns schema
  },
});

export const completeRetrospective = mutation({
  args: {
    id: v.id('retrospectives'),
    reportMarkdown: v.string(),
    aggregatedDataJson: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    await ctx.db.patch(args.id, {
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
    id: v.id('retrospectives'),
    reportMarkdown: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    await ctx.db.patch(args.id, {
      status: 'failed',
      reportMarkdown: args.reportMarkdown,
      completedAt: Date.now(),
    });
    return null;
  },
});

export const getSprintAggregateData = query({
  args: { sprintId: v.id('sprints') },
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
        tasksRejected: v.number(),
        tasksBlocked: v.number(),
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

    const sprint = await ctx.db.get(args.sprintId);
    if (!sprint) {
      throw new Error(`Sprint not found: ${args.sprintId}`);
    }

    const project = await ctx.db.get(sprint.projectId);
    const projectSlug = project?.slug ?? '';

    const tasks = await ctx.db
      .query('tasks')
      .withIndex('by_sprint', (q) => q.eq('sprintId', args.sprintId))
      .collect();

    const sprintTaskKeys = new Set(tasks.filter((t) => t.taskKey).map((t) => t.taskKey!));

    const allWorkRuns = await ctx.db
      .query('workRuns')
      .withIndex('by_project', (q) => q.eq('projectSlug', projectSlug))
      .collect();
    const workRuns = allWorkRuns.filter(
      (r) => r.selectedTaskKey && sprintTaskKeys.has(r.selectedTaskKey),
    );

    const allErrors = await ctx.db
      .query('orchestratorErrors')
      .withIndex('by_project', (q) => q.eq('projectSlug', projectSlug))
      .collect();
    const sprintErrors = allErrors.filter(
      (e) => !e.taskKey || sprintTaskKeys.has(e.taskKey),
    );

    const workRunIds = new Set(workRuns.map((r) => r.runId).filter(Boolean));
    const allExecLogs = await ctx.db
      .query('executionLogs')
      .withIndex('by_project', (q) => q.eq('projectSlug', projectSlug))
      .collect();
    const sprintExecLogs = allExecLogs.filter(
      (l) => workRunIds.has(l.runId),
    );

    const agents = await ctx.db.query('agents').collect();
    const agentMap = new Map(agents.map((a) => [a._id, a.name]));

    const sprintDoc = {
      projectSlug,
      name: sprint.name,
      status: sprint.status,
      startDate: sprint.startedAt ?? sprint.createdAt,
      endDate: sprint.closedAt ?? sprint.createdAt,
      taskKeys: tasks.filter((t) => t.taskKey).map((t) => t.taskKey!),
      updatedAt: sprint.closedAt ?? sprint.createdAt,
    };

    const taskDocs = tasks.map((t) => ({
      taskKey: t.taskKey ?? '',
      projectSlug,
      trackId: '',
      title: t.title,
      status: t.status,
      assignee: t.assigneeId ? (agentMap.get(t.assigneeId) ?? 'unassigned') : 'unassigned',
      dependencies: [],
      updatedAt: t.updatedAt ?? Date.now(),
      startedAt: t.createdAt,
      sessionId: t.sessionId,
    }));

    const workRunDocs = workRuns.map((r) => ({
      runId: r.runId ?? '',
      projectSlug,
      selectedTaskKey: r.selectedTaskKey,
      status: r.status,
      startedAt: r.startedAt ?? Date.now(),
      finishedAt: r.finishedAt,
    }));

    const errorDocs = sprintErrors.map((e) => ({
      projectSlug,
      operation: e.operation,
      message: e.message,
      severity: e.severity as 'fatal' | 'warning' | 'info',
      createdAt: e.createdAt,
    }));

    const execLogDocs = sprintExecLogs.map((l) => ({
      runId: l.runId ?? '',
      projectSlug,
      status: l.status,
      summary: l.summary ?? '',
      createdAt: l.createdAt ?? Date.now(),
    }));

    const result = aggregateSprintData(
      sprintDoc,
      taskDocs,
      workRunDocs,
      [],
      execLogDocs,
      errorDocs,
    );

    return result;
  },
});

export const getSprintCostTrend = query({
  args: { sprintId: v.id('sprints') },
  returns: v.array(
    v.object({
      sprintName: v.string(),
      budget: v.number(),
      actualCost: v.number(),
      costPerPoint: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);

    const sprint = await ctx.db.get(args.sprintId);
    if (!sprint) return [];

    const allSprints = await ctx.db
      .query('sprints')
      .withIndex('by_project', (q) => q.eq('projectId', sprint.projectId))
      .order('asc')
      .collect();

    return allSprints.map((s) => ({
      sprintName: s.name,
      budget: s.budget,
      actualCost: s.actualCost,
      costPerPoint: s.pointsDelivered > 0 ? s.actualCost / s.pointsDelivered : 0,
    }));
  },
});

export const getSprintRejectionReasons = query({
  args: { sprintId: v.id('sprints') },
  returns: v.array(
    v.object({
      reason: v.string(),
      count: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);

    const tasks = await ctx.db
      .query('tasks')
      .withIndex('by_sprint', (q) => q.eq('sprintId', args.sprintId))
      .collect();

    const reasonMap = new Map<string, number>();
    for (const task of tasks) {
      if (task.rejectionReason) {
        const reason = task.rejectionReason.slice(0, 100);
        reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1);
      }
    }

    return Array.from(reasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
  },
});
