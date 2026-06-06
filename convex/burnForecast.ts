import { v } from 'convex/values';
import { query } from './_generated/server';
import {
  computeBurnForecast,
  recommendTaskCuts,
  type CompletedTaskData,
  type TaskCandidate,
} from './lib/burnForecast';
import { burnAction } from './lib/validators';

export const getSprintBurnForecast = query({
  args: { sprintId: v.id('sprints') },
  returns: v.object({
    burnRatePerHour: v.number(),
    projectedExhaustionMs: v.union(v.number(), v.null()),
    remainingBudget: v.number(),
    confidence: v.number(),
    dataPoints: v.number(),
    atRisk: v.boolean(),
    sprintBudget: v.number(),
    currentSpend: v.number(),
  }),
  handler: async (ctx, args) => {
    const sprint = await ctx.db.get(args.sprintId);
    if (!sprint) {
      return {
        burnRatePerHour: 0,
        projectedExhaustionMs: null,
        remainingBudget: 0,
        confidence: 0,
        dataPoints: 0,
        atRisk: false,
        sprintBudget: 0,
        currentSpend: 0,
      };
    }

    const tasks = await ctx.db
      .query('tasks')
      .withIndex('by_sprint', (q) => q.eq('sprintId', args.sprintId))
      .collect();

    const completedTasks: CompletedTaskData[] = tasks
      .filter((t) => t.status === 'done' && t.actualCost != null && t.actualCost > 0)
      .map((t) => ({
        actualCost: t.actualCost!,
        completedAt: t.updatedAt,
        storyPoints: t.storyPoints,
      }));

    const currentSpend = tasks.reduce((sum, t) => sum + (t.actualCost ?? 0), 0);

    const forecast = computeBurnForecast(completedTasks, sprint.budget, Date.now());

    return {
      ...forecast,
      sprintBudget: sprint.budget,
      currentSpend,
    };
  },
});

export const getSprintTaskRecommendations = query({
  args: { sprintId: v.id('sprints') },
  returns: v.array(
    v.object({
      taskId: v.id('tasks'),
      title: v.string(),
      costEstimate: v.number(),
      storyPoints: v.number(),
      action: burnAction,
      savingsEstimate: v.number(),
      reason: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const sprint = await ctx.db.get(args.sprintId);
    if (!sprint) return [];

    const tasks = await ctx.db
      .query('tasks')
      .withIndex('by_sprint', (q) => q.eq('sprintId', args.sprintId))
      .collect();

    const currentSpend = tasks.reduce((sum, t) => sum + (t.actualCost ?? 0), 0);
    const remainingBudget = sprint.budget - currentSpend;

    const candidates: TaskCandidate[] = tasks
      .filter((t) => t.status === 'ready' || t.status === 'backlog')
      .map((t) => ({
        taskId: t._id,
        title: t.title,
        costEstimate: t.costEstimate,
        storyPoints: t.storyPoints,
        status: t.status,
      }));

    return recommendTaskCuts(candidates, remainingBudget);
  },
});
