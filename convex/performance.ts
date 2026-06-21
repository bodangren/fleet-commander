import { v } from 'convex/values';
import { query } from './_generated/server';
import { resolveActor } from './lib/auth';
import {
  computePhaseBreakdown,
  computePhaseTrends,
  computeAgentLatencyStats,
  detectSlowAgents,
  computeBaselineSnapshots,
  computeRegressions,
  type BaselineSnapshot,
} from './lib/performance';
import { performanceTrend } from './lib/validators';

const MS_PER_DAY = 86400000;

export const getPhaseBreakdown = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
    agent: v.optional(v.string()),
  },
  returns: v.object({
    load: v.object({ p50: v.number(), p95: v.number(), p99: v.number() }),
    score: v.object({ p50: v.number(), p95: v.number(), p99: v.number() }),
    execute: v.object({ p50: v.number(), p95: v.number(), p99: v.number() }),
    persist: v.object({ p50: v.number(), p95: v.number(), p99: v.number() }),
    hookBefore: v.object({ p50: v.number(), p95: v.number(), p99: v.number() }),
    hookAfter: v.object({ p50: v.number(), p95: v.number(), p99: v.number() }),
    total: v.object({ p50: v.number(), p95: v.number(), p99: v.number() }),
  }),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const days = args.days ?? 30;
    const cutoff = Date.now() - days * MS_PER_DAY;

    let runs;
    if (args.agent) {
      runs = await ctx.db
        .query('workRuns')
        .withIndex('by_runnerHost_and_started_at', (q) =>
          q.eq('runnerHost', args.agent!).gte('startedAt', cutoff))
        .take(1000);
    } else if (args.projectSlug) {
      runs = await ctx.db
        .query('workRuns')
        .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug!))
        .filter((q) => q.gte(q.field('startedAt'), cutoff))
        .take(1000);
    } else {
      runs = await ctx.db
        .query('workRuns')
        .withIndex('by_started_at', (q) => q.gte('startedAt', cutoff))
        .take(1000);
    }

    return computePhaseBreakdown(runs);
  },
});

export const getPhaseTrends = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
    agent: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      date: v.string(),
      loadAvg: v.number(),
      scoreAvg: v.number(),
      executeAvg: v.number(),
      persistAvg: v.number(),
      hookBeforeAvg: v.number(),
      hookAfterAvg: v.number(),
      totalAvg: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const days = args.days ?? 30;
    const now = Date.now();
    const cutoff = now - days * MS_PER_DAY;

    let runs;
    if (args.agent) {
      runs = await ctx.db
        .query('workRuns')
        .withIndex('by_runnerHost_and_started_at', (q) =>
          q.eq('runnerHost', args.agent!).gte('startedAt', cutoff))
        .take(1000);
    } else if (args.projectSlug) {
      runs = await ctx.db
        .query('workRuns')
        .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug!))
        .filter((q) => q.gte(q.field('startedAt'), cutoff))
        .take(1000);
    } else {
      runs = await ctx.db
        .query('workRuns')
        .withIndex('by_started_at', (q) => q.gte('startedAt', cutoff))
        .take(1000);
    }

    return computePhaseTrends(runs, now, days);
  },
});

export const getAgentLatencyStats = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      agent: v.string(),
      p95: v.number(),
      p50: v.number(),
      avg: v.number(),
      runCount: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const days = args.days ?? 7;
    const cutoff = Date.now() - days * MS_PER_DAY;

    let workQuery = ctx.db
      .query('workRuns')
      .withIndex('by_started_at', (q) => q.gte('startedAt', cutoff));
    if (args.projectSlug) {
      workQuery = ctx.db
        .query('workRuns')
        .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug!))
        .filter((q) => q.gte(q.field('startedAt'), cutoff));
    }

    const runs = await workQuery.collect();
    return computeAgentLatencyStats(runs);
  },
});

export const getSlowAgents = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
    thresholdMultiplier: v.optional(v.number()),
    minConsecutiveBreaches: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      agent: v.string(),
      p95: v.number(),
      currentAvg: v.number(),
      threshold: v.number(),
      consecutiveBreaches: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const days = args.days ?? 7;
    const cutoff = Date.now() - days * MS_PER_DAY;

    let workQuery = ctx.db
      .query('workRuns')
      .withIndex('by_started_at', (q) => q.gte('startedAt', cutoff));
    if (args.projectSlug) {
      workQuery = ctx.db
        .query('workRuns')
        .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug!))
        .filter((q) => q.gte(q.field('startedAt'), cutoff));
    }

    const runs = await workQuery.collect();
    return detectSlowAgents(runs, {
      thresholdMultiplier: args.thresholdMultiplier ?? 1.5,
      minConsecutiveBreaches: args.minConsecutiveBreaches ?? 3,
    });
  },
});

export const getRegressionAlerts = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
    degradationThreshold: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      agent: v.string(),
      taskKind: v.string(),
      baselineAvgMs: v.number(),
      currentAvgMs: v.number(),
      degradationPercent: v.number(),
      sampleCount: v.number(),
      threshold: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const days = args.days ?? 7;
    const windowDays = 7;
    const degradationThreshold = args.degradationThreshold ?? 0.2;
    const now = Date.now();
    const cutoff = now - days * MS_PER_DAY;
    const baselineCutoff = now - windowDays * MS_PER_DAY;

    let currentQuery = ctx.db
      .query('workRuns')
      .withIndex('by_started_at', (q) => q.gte('startedAt', cutoff));
    if (args.projectSlug) {
      currentQuery = ctx.db
        .query('workRuns')
        .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug!))
        .filter((q) => q.gte(q.field('startedAt'), cutoff));
    }
    const currentRuns = await currentQuery.collect();

    let baselineQuery = ctx.db
      .query('workRuns')
      .withIndex('by_started_at', (q) => q.gte('startedAt', baselineCutoff));
    if (args.projectSlug) {
      baselineQuery = ctx.db
        .query('workRuns')
        .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug!))
        .filter((q) => q.gte(q.field('startedAt'), baselineCutoff));
    }
    const baselineRuns = await baselineQuery.collect();

    const baselineSnapshots = computeBaselineSnapshots(baselineRuns, windowDays);
    const alerts = computeRegressions(currentRuns, baselineSnapshots, degradationThreshold);

    return alerts.map((a) => ({
      agent: a.agent,
      taskKind: a.taskKind,
      baselineAvgMs: a.baselineAvgMs,
      currentAvgMs: a.currentAvgMs,
      degradationPercent: a.degradationPercent,
      sampleCount: a.sampleCount,
      threshold: a.threshold,
    }));
  },
});

export const getPerformanceOverview = query({
  args: {
    projectSlug: v.optional(v.string()),
  },
  returns: v.nullable(
    v.object({
      agents: v.array(
        v.object({
          _id: v.string(),
          name: v.string(),
          displayName: v.string(),
          model: v.string(),
          tasksCompleted: v.number(),
          totalCost: v.number(),
          costPerPoint: v.number(),
          reliability: v.number(),
          rejectionRate: v.number(),
          trend: performanceTrend,
        }),
      ),
      pipelineCosts: v.array(
        v.object({
          stage: v.string(),
          cost: v.number(),
          percentage: v.number(),
        }),
      ),
      rejectionReasons: v.array(
        v.object({
          reason: v.string(),
          count: v.number(),
          percentage: v.number(),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const projectSlug = args.projectSlug;

    let agentsQuery = ctx.db.query('agents');
    const allAgents = await agentsQuery.collect();

    const pipelineStages = ['Architect', 'Executor', 'Reviewer', 'Merger', 'Retries'];
    const stageCosts: Record<string, number> = {
      Architect: 0,
      Executor: 0,
      Reviewer: 0,
      Merger: 0,
      Retries: 0,
    };
    let totalPipelineCost = 0;

    let runs = await ctx.db.query('pipelineRuns').order('desc').take(500);
    if (projectSlug) {
      const tasks = await ctx.db.query('tasks').take(500);
      const projectTasks = new Set(
        tasks.filter((t) => t.projectSlug === projectSlug).map((t) => t._id)
      );
      runs = runs.filter((r) => r.taskId !== undefined && projectTasks.has(r.taskId));
    }

    for (const run of runs) {
      if (run.cost != null) {
        const stageName = pipelineStages.includes(run.stage) ? run.stage : 'Retries';
        stageCosts[stageName] = (stageCosts[stageName] ?? 0) + run.cost;
        totalPipelineCost += run.cost;
      }
    }

    const pipelineCosts = pipelineStages.map((stage) => ({
      stage,
      cost: stageCosts[stage],
      percentage: totalPipelineCost > 0 ? (stageCosts[stage] / totalPipelineCost) * 100 : 0,
    }));

    const agentMap = new Map<string, { tasksCompleted: number; totalCost: number; rejections: number }>();
    for (const run of runs) {
      if (!run.agentId) continue;
      const entry = agentMap.get(run.agentId) ?? { tasksCompleted: 0, totalCost: 0, rejections: 0 };
      entry.tasksCompleted += 1;
      entry.totalCost += run.cost ?? 0;
      if (run.status === 'failed') entry.rejections += 1;
      agentMap.set(run.agentId, entry);
    }

    const agents = allAgents.slice(0, 20).map((agent) => {
      const stats = agentMap.get(agent._id) ?? { tasksCompleted: 0, totalCost: 0, rejections: 0 };
      const rejectionRate = stats.tasksCompleted > 0 ? stats.rejections / stats.tasksCompleted : 0;
      const reliability = 1 - rejectionRate;
      const costPerPoint = stats.tasksCompleted > 0 ? stats.totalCost / stats.tasksCompleted : 0;
      const trend: 'improving' | 'stable' | 'declining' = reliability > 0.9 ? 'improving' : reliability > 0.8 ? 'stable' : 'declining';
      return {
        _id: agent._id,
        name: agent.name,
        displayName: (agent as any).displayName ?? agent.name,
        model: agent.model,
        tasksCompleted: stats.tasksCompleted,
        totalCost: stats.totalCost,
        costPerPoint,
        reliability,
        rejectionRate,
        trend,
      };
    });

    const rejectionReasonMap = new Map<string, number>();
    for (const run of runs) {
      if (run.status === 'failed') {
        const reason = (run as { rejectionReason?: string }).rejectionReason ?? 'Unknown';
        rejectionReasonMap.set(reason, (rejectionReasonMap.get(reason) ?? 0) + 1);
      }
    }
    let totalRejections = 0;
    for (const count of rejectionReasonMap.values()) {
      totalRejections += count;
    }
    const rejectionReasons = Array.from(rejectionReasonMap.entries())
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: totalRejections > 0 ? (count / totalRejections) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    if (agents.length === 0 && pipelineCosts.every((s) => s.cost === 0) && rejectionReasons.length === 0) {
      return null;
    }

    return { agents, pipelineCosts, rejectionReasons };
  },
});
