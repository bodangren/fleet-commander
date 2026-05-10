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
      projects,
    ] = await Promise.all([
      ctx.db
        .query('tasks')
        .withIndex('by_status', (q) => q.eq('status', 'in_progress'))
        .collect(),
      ctx.db
        .query('tasks')
        .withIndex('by_status', (q) => q.eq('status', 'blocked'))
        .collect(),
      ctx.db
        .query('issues')
        .withIndex('by_status', (q) => q.eq('status', 'open'))
        .collect(),
      ctx.db
        .query('costRecords')
        .withIndex('by_recorded_at', (q) => q.gte('recordedAt', dayStart))
        .collect(),
      ctx.db.query('projects').collect(),
    ]);

    const allActiveRuns = await ctx.db
      .query('workRuns')
      .withIndex('by_status_and_started_at', (q) => q.eq('status', 'running'))
      .collect();

    const blockedByProject = new Map<string, number>();
    for (const t of blockedTasks) {
      blockedByProject.set(
        t.projectSlug,
        (blockedByProject.get(t.projectSlug) ?? 0) + 1,
      );
    }

    const issuesByProject = new Map<string, number>();
    for (const i of openIssues) {
      issuesByProject.set(
        i.projectSlug,
        (issuesByProject.get(i.projectSlug) ?? 0) + 1,
      );
    }

    const recentlyFailedRuns = new Map<string, boolean>();
    const failedRuns = await ctx.db
      .query('workRuns')
      .withIndex('by_status_and_started_at', (q) => q.eq('status', 'failed'))
      .take(50);
    for (const r of failedRuns) {
      recentlyFailedRuns.set(r.projectSlug, true);
    }

    const todayCost = todayCostDocs.reduce((sum, r) => sum + r.costUSD, 0);

    const attentionProjects = projects
      .filter((p) => {
        const blocked = blockedByProject.get(p.slug) ?? 0;
        const issues = issuesByProject.get(p.slug) ?? 0;
        const failed = recentlyFailedRuns.has(p.slug);
        return blocked > 0 || issues > 0 || failed;
      })
      .map((p) => {
        const reasons: string[] = [];
        const blocked = blockedByProject.get(p.slug) ?? 0;
        const issues = issuesByProject.get(p.slug) ?? 0;
        if (blocked > 0) reasons.push(`${blocked} blocked`);
        if (issues > 0) reasons.push(`${issues} open issues`);
        if (recentlyFailedRuns.has(p.slug)) reasons.push('last run failed');
        return {
          slug: p.slug,
          name: p.name,
          reason: reasons.join(', '),
        };
      });

    return {
      activeTasks: activeTasks.length,
      blockedTasks: blockedTasks.length,
      openIssues: openIssues.length,
      activeRuns: allActiveRuns.length,
      todayCost,
      attentionProjects,
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
  handler: async (ctx, args) => {
    await resolveActor(ctx);

    let blockedDocs = await ctx.db
      .query('tasks')
      .withIndex('by_status_and_updated_at', (q) =>
        q.eq('status', 'blocked'),
      )
      .collect();

    if (args.projectSlug) {
      blockedDocs = blockedDocs.filter(
        (d) => d.projectSlug === args.projectSlug,
      );
    }
    if (args.assignee) {
      blockedDocs = blockedDocs.filter(
        (d) => d.assignee === args.assignee,
      );
    }

    const projectMap = new Map<string, string>();
    const projects = await ctx.db.query('projects').collect();
    for (const p of projects) projectMap.set(p.slug, p.name);

    return blockedDocs.map((d) => ({
      projectSlug: d.projectSlug,
      trackId: d.trackId,
      taskKey: d.taskKey,
      title: d.title,
      status: d.status,
      assignee: d.assignee,
      updatedAt: d.updatedAt,
      projectName: projectMap.get(d.projectSlug),
    }));
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
      issueDocs = issueDocs.filter(
        (d) => d.projectSlug === args.projectSlug,
      );
    }
    if (args.assignedAgent) {
      issueDocs = issueDocs.filter(
        (d) => d.assignedAgent === args.assignedAgent,
      );
    }

    issueDocs.sort((a, b) => a.openedAt - b.openedAt);

    const projectMap = new Map<string, string>();
    const projects = await ctx.db.query('projects').collect();
    for (const p of projects) projectMap.set(p.slug, p.name);

    return issueDocs.map((d) => ({
      projectSlug: d.projectSlug,
      trackId: d.trackId,
      issueId: d.issueId,
      title: d.title,
      status: d.status,
      assignedAgent: d.assignedAgent,
      openedAt: d.openedAt,
      projectName: projectMap.get(d.projectSlug),
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

    const projectMap = new Map<string, string>();
    const projects = await ctx.db.query('projects').collect();
    for (const p of projects) projectMap.set(p.slug, p.name);

    return runs.map((r) => ({
      projectSlug: r.projectSlug,
      runId: r.runId,
      status: r.status,
      selectedTaskKey: r.selectedTaskKey,
      runnerHost: r.runnerHost,
      startedAt: r.startedAt,
      totalMs: r.totalMs,
      projectName: projectMap.get(r.projectSlug),
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
    const tasks = await ctx.db
      .query('tasks')
      .withIndex('by_status', (q) => q.eq('status', 'in_progress'))
      .collect();

    const projectMap = new Map<string, string>();
    const projects = await ctx.db.query('projects').collect();
    for (const p of projects) projectMap.set(p.slug, p.name);

    const taskByAgent = new Map<string, (typeof tasks)[0]>();
    for (const t of tasks) {
      if (t.assignee) taskByAgent.set(t.assignee, t);
    }

    const readyTasks = await ctx.db
      .query('tasks')
      .withIndex('by_status', (q) => q.eq('status', 'ready'))
      .collect();
    const queueDepthByAgent = new Map<string, number>();
    for (const t of readyTasks) {
      if (t.assignee) {
        queueDepthByAgent.set(
          t.assignee,
          (queueDepthByAgent.get(t.assignee) ?? 0) + 1,
        );
      }
    }

    const harnessStats = await ctx.db
      .query('harnessReliabilityStats')
      .collect();
    const latencyByHarness = new Map<string, number>();
    for (const s of harnessStats) {
      latencyByHarness.set(s.harnessName, s.medianLatencyMs);
    }

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentContracts = await ctx.db
      .query('runContracts')
      .withIndex('by_created_at', (q) => q.gte('createdAt', sevenDaysAgo))
      .collect();

    const contractsByAgent = new Map<
      string,
      { passed: number; total: number }
    >();
    for (const c of recentContracts) {
      if (!c.executorStatus) continue;
      const existing = contractsByAgent.get(c.harnessName ?? 'opencode') ?? {
        passed: 0,
        total: 0,
      };
      existing.total++;
      if (c.executorStatus === 'succeeded') existing.passed++;
      contractsByAgent.set(c.harnessName ?? 'opencode', existing);
    }

    const circuitBreakers = await ctx.db
      .query('circuitBreakers')
      .collect();
    const circuitByAgent = new Map<string, string>();
    for (const cb of circuitBreakers) {
      circuitByAgent.set(cb.agentId, cb.state);
    }

    return agents.map((agent) => {
      const currentTask = taskByAgent.get(agent.name);
      const stats = contractsByAgent.get(agent.name) ?? {
        passed: 0,
        total: 0,
      };
      const successRate7d =
        stats.total > 0 ? stats.passed / stats.total : 0;
      const latency = latencyByHarness.get(agent.name) ?? 0;
      const queueDepth = queueDepthByAgent.get(agent.name) ?? 0;
      const circuitState = circuitByAgent.get(agent.name);

      return {
        name: agent.name,
        displayName: agent.displayName,
        mode: agent.mode,
        model: agent.model,
        currentTask: currentTask
          ? {
              taskKey: currentTask.taskKey,
              title: currentTask.title,
              projectSlug: currentTask.projectSlug,
              projectName: projectMap.get(currentTask.projectSlug),
            }
          : undefined,
        successRate7d,
        medianLatencyMs: latency,
        queueDepth,
        circuitState: circuitState as
          | 'closed'
          | 'open'
          | 'half-open'
          | undefined,
      };
    });
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
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const sprints = await ctx.db
      .query('sprints')
      .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug))
      .collect();
    return sprints.find((s) => s.status === 'active') ?? null;
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
  handler: async (ctx, args) => {
    await resolveActor(ctx);

    const results = await Promise.all(
      args.taskKeys.map(async (taskKey) => {
        const doc = await ctx.db
          .query('tasks')
          .withIndex('by_taskKey', (q) => q.eq('taskKey', taskKey))
          .unique();
        if (!doc || doc.projectSlug !== args.projectSlug) return null;
        return {
          projectSlug: doc.projectSlug,
          trackId: doc.trackId,
          taskKey: doc.taskKey,
          title: doc.title,
          status: doc.status,
          assignee: doc.assignee,
          updatedAt: doc.updatedAt,
        };
      }),
    );
    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});