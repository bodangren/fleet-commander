import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { pipelineStage } from './lib/validators';

const pipelineRunResponse = v.object({
  _id: v.id('pipelineRuns'),
  taskId: v.optional(v.id('tasks')),
  executionId: v.optional(v.string()),
  stage: pipelineStage,
  agentId: v.optional(v.id('agents')),
  startTime: v.number(),
  endTime: v.optional(v.number()),
  cost: v.optional(v.number()),
  status: v.union(
    v.literal('running'),
    v.literal('completed'),
    v.literal('failed'),
  ),
  createdAt: v.number(),
});

export const listPipelineRunsHandler = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(pipelineRunResponse),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const docs = await ctx.db
      .query('pipelineRuns')
      .order('desc')
      .take(limit);
    return docs.map((doc) => {
      const { _creationTime, ...rest } = doc as any;
      return rest;
    });
  },
});

export const getPipelineRunHandler = query({
  args: { id: v.id('pipelineRuns') },
  returns: v.union(v.null(), pipelineRunResponse),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    const { _creationTime, ...rest } = doc as any;
    return rest;
  },
});

export const createPipelineRunHandler = mutation({
  args: {
    taskId: v.optional(v.id('tasks')),
    executionId: v.optional(v.string()),
    stage: pipelineStage,
    agentId: v.optional(v.id('agents')),
  },
  returns: v.id('pipelineRuns'),
  handler: async (ctx, args) => {
    if (args.taskId) {
      const running = await ctx.db
        .query('pipelineRuns')
        .withIndex('by_task', (q) => q.eq('taskId', args.taskId))
        .collect();
      if (running.some((r) => r.status === 'running')) {
        throw new Error('Task already has a running pipeline run');
      }
    }

    const now = Date.now();
    return ctx.db.insert('pipelineRuns', {
      taskId: args.taskId ?? undefined,
      executionId: args.executionId ?? undefined,
      stage: args.stage,
      agentId: args.agentId ?? undefined,
      startTime: now,
      endTime: undefined,
      cost: undefined,
      status: 'running',
      createdAt: now,
    });
  },
});

export const updatePipelineRunStatusHandler = mutation({
  args: {
    id: v.id('pipelineRuns'),
    status: v.union(
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed'),
    ),
    cost: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status };
    if (args.status === 'completed' || args.status === 'failed') {
      patch.endTime = Date.now();
    }
    if (args.cost !== undefined) {
      patch.cost = args.cost;
    }
    await ctx.db.patch(args.id, patch);
    return null;
  },
});

export const getPipelineRunsByTaskHandler = query({
  args: { taskId: v.id('tasks') },
  returns: v.array(pipelineRunResponse),
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query('pipelineRuns')
      .withIndex('by_task', (q) => q.eq('taskId', args.taskId))
      .collect();
    const sorted = docs.sort((a, b) => a.startTime - b.startTime);
    return sorted.map((doc) => {
      const { _creationTime, ...rest } = doc as any;
      return rest;
    });
  },
});

export const getPipelineRunCostByTaskHandler = query({
  args: { taskId: v.id('tasks') },
  returns: v.object({
    totalCost: v.number(),
    stageCosts: v.record(v.string(), v.number()),
  }),
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query('pipelineRuns')
      .withIndex('by_task', (q) => q.eq('taskId', args.taskId))
      .collect();

    const stageCosts: Record<string, number> = {};
    let totalCost = 0;

    for (const run of docs) {
      if (run.status === 'completed' && run.cost != null) {
        const stage = run.stage as string;
        stageCosts[stage] = (stageCosts[stage] ?? 0) + run.cost;
        totalCost += run.cost;
      }
    }

    return { totalCost, stageCosts };
  },
});