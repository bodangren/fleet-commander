import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { resolveActor } from './lib/auth';
import { aggregateSprintData } from './lib/retrospective';
import { api } from './_generated/api';

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

    const retro = await ctx.db.get(args.id);
    if (retro) {
      try {
        await ctx.runMutation(api.notifications.notifyRetrospectiveReady, {
          userId: retro.projectSlug ? `owner:${retro.projectSlug}` : 'admin:global',
          retrospectiveName: retro.name,
          projectSlug: retro.projectSlug ?? undefined,
        });
      } catch {
        // Non-critical
      }
    }

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

    const taskIds = new Set(tasks.map((t) => t._id));

    const allWorkRuns = await ctx.db
      .query('workRuns')
      .withIndex('by_project', (q) => q.eq('projectSlug', projectSlug))
      .collect();
    const workRuns = allWorkRuns.filter(
      (r) => r.selectedTaskKey && tasks.some((t) => t.taskKey === r.selectedTaskKey),
    );

    const allErrors = await ctx.db
      .query('orchestratorErrors')
      .withIndex('by_project', (q) => q.eq('projectSlug', projectSlug))
      .collect();

    const allExecLogs = await ctx.db
      .query('executionLogs')
      .withIndex('by_project', (q) => q.eq('projectSlug', projectSlug))
      .collect();

    const agents = await ctx.db.query('agents').collect();
    const agentMap = new Map(agents.map((a) => [a._id, a.name]));

    const planned = tasks.length;
    const completed = tasks.filter((t) => t.status === 'done').length;
    const blocked = tasks.filter((t) => t.status === 'blocked').length;

    const failedTaskKeys = new Set<string>();
    for (const run of workRuns) {
      if (run.status === 'failed' && run.selectedTaskKey) {
        failedTaskKeys.add(run.selectedTaskKey);
      }
    }
    const failed = failedTaskKeys.size;

    const carriedOver = tasks.filter((t) => t.status !== 'done').length;

    const agentWorkloadMap = new Map<
      string,
      { assigned: number; completed: number; durations: number[] }
    >();
    for (const t of tasks) {
      const agentName = t.assigneeId ? (agentMap.get(t.assigneeId) ?? 'unassigned') : 'unassigned';
      const entry = agentWorkloadMap.get(agentName) ?? {
        assigned: 0,
        completed: 0,
        durations: [],
      };
      entry.assigned++;
      if (t.status === 'done') entry.completed++;
      if (t.createdAt && t.updatedAt) {
        entry.durations.push(t.updatedAt - t.createdAt);
      }
      agentWorkloadMap.set(agentName, entry);
    }
    const agentWorkload = Array.from(agentWorkloadMap.entries()).map(([agent, stats]) => ({
      agent,
      tasksAssigned: stats.assigned,
      tasksCompleted: stats.completed,
      avgDurationMs:
        stats.durations.length > 0
          ? Math.round(stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length)
          : 0,
    }));

    const patternMap = new Map<string, number>();
    for (const err of allErrors) {
      const key = err.operation.split(':')[0].trim().toLowerCase() || 'unknown';
      patternMap.set(key, (patternMap.get(key) ?? 0) + 1);
    }
    const issuePatterns = Array.from(patternMap.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count);

    const velocity = {
      planned,
      completed,
      completionRate: planned > 0 ? completed / planned : 0,
    };

    const HOOK_PHASES = ['beforeRunHook', 'afterRunHook', 'afterCreateHook'];
    const hookMap = new Map<string, number>();
    for (const err of allErrors) {
      for (const phase of HOOK_PHASES) {
        if (err.operation.includes(phase)) {
          hookMap.set(phase, (hookMap.get(phase) ?? 0) + 1);
        }
      }
    }
    const hookFailures = HOOK_PHASES.map((phase) => ({
      phase,
      count: hookMap.get(phase) ?? 0,
    }));

    const sessionTasks = tasks.filter((t) => t.sessionId);
    const sessionIds = new Set(sessionTasks.map((t) => t.sessionId!));
    const resumedSessions = new Set<string>();
    const seenSessions = new Set<string>();
    for (const t of tasks) {
      if (!t.sessionId) continue;
      if (seenSessions.has(t.sessionId)) {
        resumedSessions.add(t.sessionId);
      } else {
        seenSessions.add(t.sessionId);
      }
    }
    const sessionMetrics = {
      totalSessions: sessionIds.size,
      resumedSessions: resumedSessions.size,
      continuationRate: sessionIds.size > 0 ? resumedSessions.size / sessionIds.size : 0,
    };

    const priorityMap = new Map<
      string,
      { total: number; completed: number; cycleTimes: number[] }
    >();
    for (const t of tasks) {
      const prio = t.priority;
      const entry = priorityMap.get(prio) ?? { total: 0, completed: 0, cycleTimes: [] };
      entry.total++;
      if (t.status === 'done') entry.completed++;
      if (t.createdAt && t.updatedAt) {
        entry.cycleTimes.push(t.updatedAt - t.createdAt);
      }
      priorityMap.set(prio, entry);
    }
    const priorityCorrelation = Array.from(priorityMap.entries()).map(([priority, stats]) => ({
      priority,
      total: stats.total,
      completed: stats.completed,
      completionRate: stats.total > 0 ? stats.completed / stats.total : 0,
      avgCycleTimeMs:
        stats.cycleTimes.length > 0
          ? Math.round(stats.cycleTimes.reduce((a, b) => a + b, 0) / stats.cycleTimes.length)
          : 0,
    }));

    const blockedByChains = tasks
      .filter((t) => t.blockerReason)
      .map((t) => ({
        taskKey: t.taskKey ?? t._id,
        blockerCount: t.blockerReason ? 1 : 0,
        cycleTimeMs: t.createdAt && t.updatedAt ? t.updatedAt - t.createdAt : null,
      }));

    const errorMessages = new Map<string, number>();
    for (const log of allExecLogs) {
      if (log.status === 'failed') {
        const msg = log.summary.split('\n')[0].slice(0, 120);
        errorMessages.set(msg, (errorMessages.get(msg) ?? 0) + 1);
      }
    }
    for (const err of allErrors) {
      if (err.severity === 'fatal' || err.severity === 'warning') {
        const msg = err.message.slice(0, 120);
        errorMessages.set(msg, (errorMessages.get(msg) ?? 0) + 1);
      }
    }
    const topErrors = Array.from(errorMessages.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      sprintName: sprint.name,
      projectSlug,
      dateRange: {
        start: sprint.startedAt
          ? new Date(sprint.startedAt).toISOString().slice(0, 10)
          : new Date(sprint.createdAt).toISOString().slice(0, 10),
        end: sprint.closedAt
          ? new Date(sprint.closedAt).toISOString().slice(0, 10)
          : new Date(sprint.createdAt).toISOString().slice(0, 10),
      },
      taskCounts: { planned, completed, blocked, failed, carriedOver },
      agentWorkload,
      issuePatterns,
      velocity,
      hookFailures,
      sessionMetrics,
      priorityCorrelation,
      blockedByChains,
      topErrors,
    };
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

    const sprint = await ctx.db.get(args.sprintId);
    if (!sprint) return [];

    const tasks = await ctx.db
      .query('tasks')
      .withIndex('by_sprint', (q) => q.eq('sprintId', args.sprintId))
      .collect();

    const taskKeys = new Set(tasks.filter((t) => t.taskKey).map((t) => t.taskKey!));
    if (taskKeys.size === 0) return [];

    const project = await ctx.db.get(sprint.projectId);
    const projectSlug = project?.slug ?? '';

    const contracts = await ctx.db
      .query('runContracts')
      .withIndex('by_project', (q) => q.eq('projectSlug', projectSlug))
      .collect();

    const reasonMap = new Map<string, number>();
    for (const contract of contracts) {
      if (!contract.dispatchRejections) continue;
      for (const rejection of contract.dispatchRejections) {
        if (taskKeys.has(rejection.taskKey)) {
          const reason = rejection.reason.slice(0, 100);
          reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1);
        }
      }
    }

    return Array.from(reasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
  },
});
