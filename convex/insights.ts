import { v } from 'convex/values';
import { query } from './_generated/server';
import { resolveActor } from './lib/auth';

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
    throw new Error('Not implemented');
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
    throw new Error('Not implemented');
  },
});
