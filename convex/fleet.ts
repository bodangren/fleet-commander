import { v } from 'convex/values';
import { query } from './_generated/server';
import { resolveActor } from './lib/auth';

export const getFleetStatus = query({
  args: {},
  returns: v.object({
    activeTasks: v.number(),
    blockedTasks: v.number(),
    openIssues: v.number(),
    activeRuns: v.number(),
    todayCost: v.number(),
    attentionProjects: v.array(v.object({
      slug: v.string(),
      name: v.string(),
      reason: v.string(),
    })),
  }),
  handler: async (ctx) => {
    await resolveActor(ctx);

    const now = Date.now();
    const dayStart = now - (now % 86400000);

    const [
      activeTasks,
      blockedTasks,
      openIssues,
      todayCostDocs,
    ] = await Promise.all([
      ctx.db.query('tasks').withIndex('by_status', (q) => q.eq('status', 'in_progress')).collect(),
      ctx.db.query('tasks').withIndex('by_status', (q) => q.eq('status', 'blocked')).collect(),
      ctx.db.query('issues').withIndex('by_status', (q) => q.eq('status', 'open')).collect(),
      ctx.db.query('costRecords').withIndex('by_recorded_at', (q) => q.gte('recordedAt', dayStart)).collect(),
    ]);

    const allActiveRuns = await ctx.db
      .query('workRuns')
      .withIndex('by_status_and_started_at', (q) => q.eq('status', 'running'))
      .collect();

    const todayCost = todayCostDocs.reduce((sum, r) => sum + r.costUSD, 0);

    return {
      activeTasks: activeTasks.length,
      blockedTasks: blockedTasks.length,
      openIssues: openIssues.length,
      activeRuns: allActiveRuns.length,
      todayCost,
      attentionProjects: [],
    };
  },
});

export const getBlockedTasksAcrossProjects = query({
  args: {
    projectSlug: v.optional(v.string()),
    assignee: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      projectSlug: v.string(),
      trackId: v.string(),
      taskKey: v.string(),
      title: v.string(),
      status: v.string(),
      assignee: v.optional(v.string()),
      updatedAt: v.number(),
      projectName: v.optional(v.string()),
    }),
  ),
  handler: async (_ctx, _args) => {
    return [];
  },
});

export const getOpenIssuesAcrossProjects = query({
  args: {
    projectSlug: v.optional(v.string()),
    assignedAgent: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      projectSlug: v.string(),
      trackId: v.optional(v.string()),
      issueId: v.string(),
      title: v.string(),
      status: v.string(),
      assignedAgent: v.optional(v.string()),
      openedAt: v.number(),
      projectName: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);

    let issueDocs = await ctx.db
      .query('issues')
      .withIndex('by_status_and_openedAt', (q) => q.eq('status', 'open'))
      .collect();

    if (args.projectSlug) {
      issueDocs = issueDocs.filter((d) => d.projectSlug === args.projectSlug);
    }
    if (args.assignedAgent) {
      issueDocs = issueDocs.filter((d) => d.assignedAgent === args.assignedAgent);
    }

    issueDocs.sort((a, b) => a.openedAt - b.openedAt);

    return issueDocs.map((d) => ({
      projectSlug: d.projectSlug,
      trackId: d.trackId,
      issueId: d.issueId,
      title: d.title,
      status: d.status,
      assignedAgent: d.assignedAgent,
      openedAt: d.openedAt,
      projectName: undefined,
    }));
  },
});

export const getActiveRunsAcrossProjects = query({
  args: {},
  returns: v.array(
    v.object({
      projectSlug: v.string(),
      runId: v.string(),
      status: v.string(),
      selectedTaskKey: v.optional(v.string()),
      runnerHost: v.optional(v.string()),
      startedAt: v.number(),
      totalMs: v.optional(v.number()),
      projectName: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    await resolveActor(ctx);

    const runs = await ctx.db
      .query('workRuns')
      .withIndex('by_status_and_started_at', (q) => q.eq('status', 'running'))
      .collect();

    return runs.map((r) => ({
      projectSlug: r.projectSlug,
      runId: r.runId,
      status: r.status,
      selectedTaskKey: r.selectedTaskKey,
      runnerHost: r.runnerHost,
      startedAt: r.startedAt,
      totalMs: r.totalMs,
      projectName: undefined,
    }));
  },
});

export const getAgentWorkload = query({
  args: {},
  returns: v.array(
    v.object({
      name: v.string(),
      displayName: v.string(),
      mode: v.string(),
      model: v.string(),
      currentTask: v.optional(
        v.object({
          taskKey: v.string(),
          title: v.string(),
          projectSlug: v.string(),
          projectName: v.optional(v.string()),
        }),
      ),
      successRate7d: v.number(),
      medianLatencyMs: v.number(),
      queueDepth: v.number(),
      circuitState: v.optional(
        v.union(
          v.literal('closed'),
          v.literal('open'),
          v.literal('half-open'),
        ),
      ),
    }),
  ),
  handler: async (ctx) => {
    await resolveActor(ctx);

    const agents = await ctx.db.query('agents').collect();

    return agents.map((agent) => ({
      name: agent.name,
      displayName: (agent as any).displayName ?? agent.name,
      mode: (agent as any).mode ?? 'agent',
      model: agent.model,
      currentTask: undefined,
      successRate7d: 0,
      medianLatencyMs: 0,
      queueDepth: 0,
      circuitState: undefined,
    }));
  },
});

export const getAlertsWithFilters = query({
  args: {
    severity: v.optional(
      v.union(v.literal('critical'), v.literal('warning'), v.literal('info')),
    ),
    type: v.optional(v.string()),
    resolved: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id('alerts'),
      type: v.string(),
      severity: v.string(),
      message: v.string(),
      contextJson: v.string(),
      resolved: v.boolean(),
      resolvedAt: v.optional(v.number()),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);

    if (args.resolved === false) {
      let docs = await ctx.db
        .query('alerts')
        .withIndex('by_resolved', (q) => q.eq('resolved', false))
        .collect();

      if (args.severity) {
        docs = docs.filter((d) => d.severity === args.severity);
      }
      if (args.type) {
        docs = docs.filter((d) => d.type === args.type);
      }
      docs.sort((a, b) => b.createdAt - a.createdAt);
      return docs;
    }

    let docs = await ctx.db
      .query('alerts')
      .order('desc')
      .collect();

    if (args.severity) {
      docs = docs.filter((d) => d.severity === args.severity);
    }
    if (args.type) {
      docs = docs.filter((d) => d.type === args.type);
    }
    if (args.resolved !== undefined) {
      docs = docs.filter((d) => d.resolved === args.resolved);
    }

    return docs;
  },
});

export const getUnresolvedCriticalCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    await resolveActor(ctx);
    const docs = await ctx.db
      .query('alerts')
      .withIndex('by_resolved', (q) => q.eq('resolved', false))
      .collect();
    return docs.filter((d) => d.severity === 'critical').length;
  },
});

export const getActiveSprintForProject = query({
  args: { projectSlug: v.string() },
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
  handler: async (_ctx, _args) => {
    return null as any;
  },
});

export const getTasksForSprint = query({
  args: {
    projectSlug: v.string(),
    taskKeys: v.array(v.string()),
  },
  returns: v.array(
    v.object({
      projectSlug: v.string(),
      trackId: v.string(),
      taskKey: v.string(),
      title: v.string(),
      status: v.string(),
      assignee: v.optional(v.string()),
      updatedAt: v.number(),
    }),
  ),
  handler: async (_ctx, _args) => {
    return [] as any;
  },
});
