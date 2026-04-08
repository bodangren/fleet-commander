import { v } from 'convex/values';
import { query } from './_generated/server';
import { resolveActor } from './lib/auth';

export const getOverview = query({
  args: {},
  returns: v.object({
    totalProjects: v.number(),
    activeProjects: v.number(),
    totalTasks: v.number(),
    completedTasks: v.number(),
    totalIssues: v.number(),
    openIssues: v.number(),
    totalRuns: v.number(),
    recentRuns: v.number(),
  }),
  handler: async (ctx) => {
    await resolveActor(ctx);
    const [projects, tasks, issues, workRuns] = await Promise.all([
      ctx.db.query('projects').collect(),
      ctx.db.query('tasks').collect(),
      ctx.db.query('issues').collect(),
      ctx.db.query('workRuns').collect(),
    ]);

    const oneDayAgo = Date.now() - 86400000;

    return {
      totalProjects: projects.length,
      activeProjects: projects.filter((p) => p.status === 'active').length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === 'done').length,
      totalIssues: issues.length,
      openIssues: issues.filter((i) => i.status === 'open').length,
      totalRuns: workRuns.length,
      recentRuns: workRuns.filter((r) => r.startedAt > oneDayAgo).length,
    };
  },
});

export const getAgentStats = query({
  args: {},
  returns: v.array(
    v.object({
      agent: v.string(),
      totalRuns: v.number(),
      successfulRuns: v.number(),
      failedRuns: v.number(),
    }),
  ),
  handler: async (ctx) => {
    await resolveActor(ctx);
    const logs = await ctx.db.query('executionLogs').collect();
    const byAgent = new Map<string, { total: number; success: number; failed: number }>();

    for (const log of logs) {
      const agent = log.summary.match(/agent[:\s]+(\w+)/i)?.[1] ?? 'unknown';
      const entry = byAgent.get(agent) ?? { total: 0, success: 0, failed: 0 };
      entry.total++;
      if (log.status === 'succeeded') entry.success++;
      if (log.status === 'failed') entry.failed++;
      byAgent.set(agent, entry);
    }

    return Array.from(byAgent.entries()).map(([agent, stats]) => ({
      agent,
      totalRuns: stats.total,
      successfulRuns: stats.success,
      failedRuns: stats.failed,
    }));
  },
});

export const getIssueStats = query({
  args: {},
  returns: v.object({
    open: v.number(),
    resolved: v.number(),
    triaged: v.number(),
  }),
  handler: async (ctx) => {
    await resolveActor(ctx);
    const issues = await ctx.db.query('issues').collect();
    return {
      open: issues.filter((i) => i.status === 'open').length,
      resolved: issues.filter((i) => i.status === 'resolved').length,
      triaged: issues.filter((i) => i.status === 'triaged').length,
    };
  },
});

export const getVelocityStats = query({
  args: { days: v.optional(v.number()) },
  returns: v.array(
    v.object({
      date: v.string(),
      completed: v.number(),
      created: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const days = args.days ?? 14;
    const tasks = await ctx.db.query('tasks').collect();
    const now = Date.now();
    const result: { date: string; completed: number; created: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = now - (i + 1) * 86400000;
      const dayEnd = now - i * 86400000;
      const dateStr = new Date(dayEnd).toISOString().slice(0, 10);

      const completed = tasks.filter(
        (t) => t.status === 'done' && t.updatedAt > dayStart && t.updatedAt <= dayEnd,
      ).length;
      const created = tasks.filter(
        (t) => t.updatedAt > dayStart && t.updatedAt <= dayEnd,
      ).length;

      result.push({ date: dateStr, completed, created });
    }

    return result;
  },
});
