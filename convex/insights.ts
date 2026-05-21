import { v } from 'convex/values';
import { query } from './_generated/server';
import { resolveActor } from './lib/auth';
import {
  computeSprintMetrics,
  computeCostTrend,
  computeAgentEfficiency,
  computeROISummary,
  computeOptimizations,
} from './lib/insights';

const MS_PER_DAY = 86400000;

export const getAnalyticsOverview = query({
  args: {
    projectId: v.optional(v.id('projects')),
    days: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.string(),
      name: v.string(),
      status: v.string(),
      budget: v.number(),
      actualCost: v.number(),
      pointsDelivered: v.number(),
      pointsEstimated: v.number(),
      taskCount: v.number(),
      completedCount: v.number(),
      velocity: v.number(),
      costPerPoint: v.number(),
      budgetAccuracy: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const { projectId, days } = args;
    const cutoff = days
      ? Date.now() - days * MS_PER_DAY
      : 0;

    let sprintsQuery = ctx.db.query('sprints').withIndex('by_project', (q) =>
      projectId ? q.eq('projectId', projectId) : q,
    );
    const sprints = await sprintsQuery.collect();

    const filtered = cutoff > 0
      ? sprints.filter(
          (s) =>
            (s.startedAt == null || s.startedAt >= cutoff) &&
            (s.closedAt == null || s.closedAt >= cutoff),
        )
      : sprints;

    return computeSprintMetrics(filtered);
  },
});

export const getCostOverview = query({
  args: {
    projectId: v.optional(v.id('projects')),
    days: v.optional(v.number()),
  },
  returns: v.object({
    costTrend: v.array(
      v.object({
        sprintName: v.string(),
        costPerPoint: v.number(),
        pointsDelivered: v.number(),
        targetCostPerPoint: v.number(),
      }),
    ),
    agentEfficiency: v.array(
      v.object({
        agentName: v.string(),
        model: v.string(),
        totalPoints: v.number(),
        totalCost: v.number(),
        costPerPoint: v.number(),
        reliability: v.number(),
        valueScore: v.union(
          v.literal('High Value'),
          v.literal('Standard'),
          v.literal('Premium'),
        ),
      }),
    ),
    roiSummary: v.object({
      avgCostPerPoint: v.number(),
      pointsPerDollar: v.number(),
      estimatedProjectCost: v.number(),
    }),
    optimizations: v.array(
      v.object({
        title: v.string(),
        description: v.string(),
        potentialSavings: v.number(),
        priority: v.union(
          v.literal('high'),
          v.literal('medium'),
          v.literal('low'),
        ),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const { projectId, days } = args;
    const cutoff = days
      ? Date.now() - days * MS_PER_DAY
      : 0;

    let sprintsQuery = ctx.db.query('sprints').withIndex('by_project', (q) =>
      projectId ? q.eq('projectId', projectId) : q,
    );
    const sprints = await sprintsQuery.collect();

    const filteredSprints = cutoff > 0
      ? sprints.filter(
          (s) =>
            (s.startedAt == null || s.startedAt >= cutoff) &&
            (s.closedAt == null || s.closedAt >= cutoff),
        )
      : sprints;

    let agentsQuery = ctx.db.query('agents');
    const allAgents = await agentsQuery.collect();

    const tasks = projectId
      ? await ctx.db.query('tasks').withIndex('by_project', (q) =>
          q.eq('projectId', projectId),
        ).collect()
      : await ctx.db.query('tasks').collect();

    let costRecordsQuery = ctx.db.query('costRecords');
    const costRecords = await costRecordsQuery.collect();

    const costTrend = computeCostTrend(filteredSprints, costRecords);

    const agentEfficiency = computeAgentEfficiency(allAgents, tasks, costRecords);
    const roiSummary = computeROISummary(costRecords, filteredSprints);
    const optimizations = computeOptimizations(agentEfficiency);

    return { costTrend, agentEfficiency, roiSummary, optimizations };
  },
});
