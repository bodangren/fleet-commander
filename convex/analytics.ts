import { v } from 'convex/values';
import { query } from './_generated/server';
import { resolveActor } from './lib/auth';

const MS_PER_DAY = 86400000;

export const getCompletionTrends = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
    trackId: v.optional(v.string()),
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

    const tasks = await tasksQuery.collect();
    const result: { date: string; completed: number; failed: number; created: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = now - (i + 1) * MS_PER_DAY;
      const dayEnd = now - i * MS_PER_DAY;
      const dateStr = new Date(dayEnd).toISOString().slice(0, 10);

      const dayTasks = tasks.filter((t) => t.updatedAt > dayStart && t.updatedAt <= dayEnd);
      const completed = dayTasks.filter((t) => t.status === 'done').length;
      const failed = dayTasks.filter((t) => t.status === 'failed').length;

      result.push({ date: dateStr, completed, failed, created: dayTasks.length });
    }

    return result;
  },
});

export const getAgentUtilization = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
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

    const workRuns = await workQuery.collect();
    const agentMap = new Map<string, Map<string, { active: number; completed: number }>>();

    for (const run of workRuns) {
      const agent = run.runnerHost ?? 'unknown';
      const dateStr = new Date(run.startedAt).toISOString().slice(0, 10);
      const dateMap = agentMap.get(agent) ?? new Map();
      const entry = dateMap.get(dateStr) ?? { active: 0, completed: 0 };

      if (run.status === 'running') {
        entry.active++;
      } else if (run.status === 'succeeded' || run.status === 'failed') {
        entry.completed++;
      }

      dateMap.set(dateStr, entry);
      agentMap.set(agent, dateMap);
    }

    const result: { agent: string; date: string; activeTasks: number; completedTasks: number }[] = [];
    for (const [agent, dateMap] of agentMap) {
      for (const [date, stats] of dateMap) {
        result.push({
          agent,
          date,
          activeTasks: stats.active,
          completedTasks: stats.completed,
        });
      }
    }

    return result.sort((a, b) => a.date.localeCompare(b.date) || a.agent.localeCompare(b.agent));
  },
});

export const getBottlenecks = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
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

    const tasks = await tasksQuery.collect();
    const trackMap = new Map<string, {
      projectSlug: string;
      total: number;
      failed: number;
      durations: number[];
      lastActivity: number;
    }>();

    for (const task of tasks) {
      const key = `${task.projectSlug}::${task.trackId}`;
      const entry = trackMap.get(key) ?? {
        projectSlug: task.projectSlug,
        total: 0,
        failed: 0,
        durations: [],
        lastActivity: 0,
      };

      entry.total++;
      if (task.status === 'failed') entry.failed++;
      if (task.startedAt && task.updatedAt) {
        entry.durations.push(task.updatedAt - task.startedAt);
      }
      entry.lastActivity = Math.max(entry.lastActivity, task.updatedAt);
      trackMap.set(key, entry);
    }

    return Array.from(trackMap.entries())
      .map(([key, stats]) => {
        const [projectSlug, trackId] = key.split('::');
        const avgDuration = stats.durations.length > 0
          ? stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length
          : 0;
        return {
          trackId,
          projectSlug,
          totalTasks: stats.total,
          failedTasks: stats.failed,
          avgDurationMs: Math.round(avgDuration),
          failureRate: stats.total > 0 ? stats.failed / stats.total : 0,
          lastActivityAt: stats.lastActivity,
        };
      })
      .sort((a, b) => b.failureRate - a.failureRate || b.avgDurationMs - a.avgDurationMs);
  },
});

export const getQueueDepth = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
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

    const tasks = await tasksQuery.collect();
    const result: { date: string; pending: number; inProgress: number; completed: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayEnd = now - i * MS_PER_DAY;
      const dateStr = new Date(dayEnd).toISOString().slice(0, 10);

      const dayTasks = tasks.filter((t) => t.updatedAt <= dayEnd);
      const pending = dayTasks.filter((t) => t.status === 'todo' || t.status === 'backlog').length;
      const inProgress = dayTasks.filter((t) => t.status === 'in_progress' || t.status === 'review').length;
      const completed = dayTasks.filter((t) => t.status === 'done').length;

      result.push({ date: dateStr, pending, inProgress, completed });
    }

    return result;
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

    const hookPhases = ['beforeRunHook', 'afterRunHook', 'afterCreateHook'];
    const hookErrors = errors.filter(
      (e) => hookPhases.some((phase) => e.operation.includes(phase)),
    );

    if (args.projectSlug) {
      const filtered = hookErrors.filter((e) => e.projectSlug === args.projectSlug);
      hookErrors.length = 0;
      hookErrors.push(...filtered);
    }

    const result: { date: string; phase: string; executions: number; failures: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = now - (i + 1) * MS_PER_DAY;
      const dayEnd = now - i * MS_PER_DAY;
      const dateStr = new Date(dayEnd).toISOString().slice(0, 10);

      for (const phase of hookPhases) {
        const dayErrors = hookErrors.filter(
          (e) => e.operation.includes(phase) && e.createdAt > dayStart && e.createdAt <= dayEnd,
        );
        result.push({
          date: dateStr,
          phase,
          executions: dayErrors.length,
          failures: dayErrors.filter((e) => e.severity === 'fatal').length,
        });
      }
    }

    return result;
  },
});

export const getSessionMetrics = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
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

    const tasks = await tasksQuery.collect();
    const sessionTasks = tasks.filter((t) => t.sessionId);
    const activeSessions = sessionTasks.filter(
      (t) => t.status === 'in_progress',
    ).length;

    const byDate: { date: string; newSessions: number; resumedSessions: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = now - (i + 1) * MS_PER_DAY;
      const dayEnd = now - i * MS_PER_DAY;
      const dateStr = new Date(dayEnd).toISOString().slice(0, 10);

      const dayTasks = tasks.filter(
        (t) => t.updatedAt > dayStart && t.updatedAt <= dayEnd,
      );
      const newSessions = dayTasks.filter(
        (t) => t.sessionId && t.startedAt && t.startedAt > dayStart && t.startedAt <= dayEnd,
      ).length;
      const resumedSessions = dayTasks.filter(
        (t) => t.sessionId && t.startedAt && t.startedAt <= dayStart,
      ).length;

      byDate.push({ date: dateStr, newSessions, resumedSessions });
    }

    return {
      totalTasks: tasks.length,
      sessionBoundTasks: sessionTasks.length,
      resumptionRate: tasks.length > 0 ? sessionTasks.length / tasks.length : 0,
      activeSessions,
      byDate,
    };
  },
});
