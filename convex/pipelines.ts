import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getPipeline = query({
  args: { executionId: v.string() },
  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query('pipelineExecutions')
      .withIndex('by_execution_id', (q) => q.eq('executionId', args.executionId))
      .first();

    if (!execution) return null;

    return {
      ...execution,
      stages: JSON.parse(execution.stagesJson),
      envOverride: execution.envOverrideJson ? JSON.parse(execution.envOverrideJson) : undefined,
    };
  },
});

export const getPipelineStatus = query({
  args: { executionId: v.string() },
  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query('pipelineExecutions')
      .withIndex('by_execution_id', (q) => q.eq('executionId', args.executionId))
      .first();

    if (!execution) return null;

    return {
      executionId: execution.executionId,
      pipelineName: execution.pipelineName,
      status: execution.status,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      stages: JSON.parse(execution.stagesJson).map((s: Record<string, unknown>) => ({
        stageName: s.stageName,
        status: s.status,
      })),
    };
  },
});

export const getPipelineLogs = query({
  args: { executionId: v.string() },
  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query('pipelineExecutions')
      .withIndex('by_execution_id', (q) => q.eq('executionId', args.executionId))
      .first();

    if (!execution) return null;

    const stages = JSON.parse(execution.stagesJson);
    const logs: Array<Record<string, unknown>> = [];

    for (const stage of stages) {
      for (const step of (stage.steps || [])) {
        logs.push({
          stage: stage.stageName,
          step: step.stepName,
          status: step.status,
          output: step.output,
          error: step.error,
          startedAt: step.startedAt,
          completedAt: step.completedAt,
        });
      }
    }

    return logs;
  },
});

export const listPipelines = query({
  args: { projectId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let q = ctx.db.query('pipelineExecutions');
    if (args.projectId) {
      q = ctx.db.query('pipelineExecutions');
    }
    const executions = await q.order('desc').take(50);

    return executions.map((e) => ({
      executionId: e.executionId,
      pipelineName: e.pipelineName,
      status: e.status,
      startedAt: e.startedAt,
      completedAt: e.completedAt,
    }));
  },
});

export const startPipeline = mutation({
  args: {
    executionId: v.string(),
    pipelineName: v.string(),
    projectId: v.optional(v.string()),
    triggeredBy: v.union(v.literal('manual'), v.literal('task-complete')),
    triggeredByTaskId: v.optional(v.string()),
    stagesJson: v.string(),
    envOverrideJson: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('pipelineExecutions', {
      executionId: args.executionId,
      pipelineName: args.pipelineName,
      projectId: args.projectId,
      status: 'running',
      stagesJson: args.stagesJson,
      triggeredBy: args.triggeredBy,
      triggeredByTaskId: args.triggeredByTaskId,
      envOverrideJson: args.envOverrideJson,
      startedAt: Date.now(),
    });
    return id;
  },
});

export const updatePipelineStatus = mutation({
  args: {
    executionId: v.string(),
    status: v.union(
      v.literal('pending'),
      v.literal('running'),
      v.literal('succeeded'),
      v.literal('failed'),
      v.literal('cancelled'),
    ),
    stagesJson: v.string(),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query('pipelineExecutions')
      .withIndex('by_execution_id', (q) => q.eq('executionId', args.executionId))
      .first();

    if (!execution) throw new Error(`Pipeline execution not found: ${args.executionId}`);

    await ctx.db.patch(execution._id, {
      status: args.status,
      stagesJson: args.stagesJson,
      completedAt: args.status !== 'running' ? Date.now() : undefined,
    });
  },
});
