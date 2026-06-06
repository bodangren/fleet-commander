import { v } from 'convex/values';
import { query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { resolveActor } from './lib/auth';
import {
  aggregateAgentMetrics,
  computeBounds,
  calculateAgentScore,
  rankAgents,
  DEFAULT_SCORE_WEIGHTS,
  type AgentMetrics,
} from './lib/leaderboard';
import { leaderboardTimeRange, leaderboardTrend } from './lib/validators';

const MS_PER_DAY = 86_400_000;

const leaderboardEntryValidator = v.object({
  agentId: v.string(),
  agentName: v.string(),
  role: v.string(),
  model: v.string(),
  rank: v.number(),
  compositeScore: v.number(),
  trend: leaderboardTrend,
  previousRank: v.union(v.number(), v.null()),
  badges: v.array(v.string()),
  metrics: v.object({
    costPerPoint: v.number(),
    rejectionRate: v.number(),
    throughput: v.number(),
    mergeRate: v.number(),
  }),
  breakdown: v.object({
    costPerPoint: v.number(),
    rejectionRate: v.number(),
    throughput: v.number(),
    mergeRate: v.number(),
  }),
});

export const getAgentLeaderboard = query({
  args: {
    role: v.optional(v.string()),
    projectSlug: v.optional(v.string()),
    timeRange: v.optional(leaderboardTimeRange),
  },
  returns: v.array(leaderboardEntryValidator),
  handler: async (ctx, args) => {
    await resolveActor(ctx);

    const timeRange = args.timeRange ?? '30d';
    const MAX_WINDOW_DAYS = 365;
    const windowDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : MAX_WINDOW_DAYS;
    const currentCutoff = Date.now() - windowDays * MS_PER_DAY;
    const previousCutoff = Date.now() - windowDays * 2 * MS_PER_DAY;

    let agentsQuery = ctx.db.query('agents');
    let agents = await agentsQuery.collect();
    if (args.role) {
      agents = agents.filter((a) => a.role === args.role);
    }

    const currentTasks = await ctx.db
      .query('tasks')
      .withIndex('by_updated_at', (q) => q.gte('updatedAt', currentCutoff))
      .collect();
    const previousTasks = await ctx.db
      .query('tasks')
      .withIndex('by_updated_at', (q) =>
        q.gte('updatedAt', previousCutoff).lt('updatedAt', currentCutoff),
      )
      .collect();

    const currentCostRecords = await ctx.db
      .query('costRecords')
      .withIndex('by_recorded_at', (q) => q.gte('recordedAt', currentCutoff))
      .collect();
    const previousCostRecords = await ctx.db
      .query('costRecords')
      .withIndex('by_recorded_at', (q) =>
        q.gte('recordedAt', previousCutoff).lt('recordedAt', currentCutoff),
      )
      .collect();

    const allSprints = await ctx.db.query('sprints').collect();
    const currentSprints = allSprints.filter(
      (s) => (s.startedAt ?? s.createdAt) >= currentCutoff,
    );
    const previousSprints = allSprints.filter(
      (s) => (s.startedAt ?? s.createdAt) >= previousCutoff && (s.startedAt ?? s.createdAt) < currentCutoff,
    );

    const currentMetrics = aggregateAgentMetrics(
      agents,
      args.projectSlug
        ? currentTasks.filter((t) => t.projectSlug === args.projectSlug)
        : currentTasks,
      args.projectSlug
        ? currentCostRecords.filter((r) => r.projectSlug === args.projectSlug)
        : currentCostRecords,
      currentSprints,
      windowDays,
    );

    const previousMetrics = aggregateAgentMetrics(
      agents,
      args.projectSlug
        ? previousTasks.filter((t) => t.projectSlug === args.projectSlug)
        : previousTasks,
      args.projectSlug
        ? previousCostRecords.filter((r) => r.projectSlug === args.projectSlug)
        : previousCostRecords,
      previousSprints,
      windowDays,
    );

    const allMetrics = [...currentMetrics, ...previousMetrics];
    const bounds = computeBounds(allMetrics);

    const currentScores = currentMetrics.map((m) =>
      calculateAgentScore(m, DEFAULT_SCORE_WEIGHTS, bounds),
    );
    const previousScores = previousMetrics.map((m) =>
      calculateAgentScore(m, DEFAULT_SCORE_WEIGHTS, bounds),
    );

    return rankAgents(currentScores, previousScores);
  },
});

export const getAgentPerformanceHistory = query({
  args: {
    agentId: v.string(),
    days: v.optional(v.number()),
  },
  returns: v.object({
    agentId: v.string(),
    agentName: v.string(),
    role: v.string(),
    model: v.string(),
    dailySnapshots: v.array(
      v.object({
        date: v.string(),
        compositeScore: v.number(),
        costPerPoint: v.number(),
        rejectionRate: v.number(),
        throughput: v.number(),
        mergeRate: v.number(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    await resolveActor(ctx);

    const days = args.days ?? 30;
    const now = Date.now();
    const cutoff = now - days * MS_PER_DAY;

    const agent = await ctx.db.get(args.agentId as Id<'agents'>);
    if (!agent) {
      return {
        agentId: args.agentId,
        agentName: 'Unknown',
        role: 'unknown',
        model: '',
        dailySnapshots: [],
      };
    }

    const allTasks = await ctx.db
      .query('tasks')
      .withIndex('by_updated_at', (q) => q.gte('updatedAt', cutoff))
      .collect();
    const agentTasks = allTasks.filter(
      (t) => t.assigneeId === (args.agentId as Id<'agents'>),
    );

    const allCostRecords = await ctx.db
      .query('costRecords')
      .withIndex('by_agent', (q) => q.eq('agentId', args.agentId))
      .collect();
    const agentCostRecords = allCostRecords.filter(
      (r) => r.recordedAt >= cutoff,
    );

    const sprints = await ctx.db.query('sprints').collect();

    const dailySnapshots: Array<{
      date: string;
      compositeScore: number;
      costPerPoint: number;
      rejectionRate: number;
      throughput: number;
      mergeRate: number;
    }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = now - (i + 1) * MS_PER_DAY;
      const dayEnd = now - i * MS_PER_DAY;
      const dateStr = new Date(dayEnd).toISOString().slice(0, 10);

      const dayTasks = agentTasks.filter(
        (t) => t.updatedAt >= dayStart && t.updatedAt < dayEnd,
      );
      const dayCostRecords = agentCostRecords.filter(
        (r) => r.recordedAt >= dayStart && r.recordedAt < dayEnd,
      );

      const metrics = aggregateAgentMetrics(
        [agent as any],
        dayTasks,
        dayCostRecords,
        sprints,
        1,
      );

      if (metrics.length > 0) {
        const score = calculateAgentScore(metrics[0], DEFAULT_SCORE_WEIGHTS);
        dailySnapshots.push({
          date: dateStr,
          compositeScore: score.compositeScore,
          costPerPoint: metrics[0].costPerPoint,
          rejectionRate: metrics[0].rejectionRate,
          throughput: metrics[0].throughput,
          mergeRate: metrics[0].mergeRate,
        });
      } else {
        dailySnapshots.push({
          date: dateStr,
          compositeScore: 0,
          costPerPoint: 0,
          rejectionRate: 0,
          throughput: 0,
          mergeRate: 0,
        });
      }
    }

    return {
      agentId: args.agentId,
      agentName: agent.name,
      role: agent.role,
      model: agent.model,
      dailySnapshots,
    };
  },
});
