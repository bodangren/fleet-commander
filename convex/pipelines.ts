import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

/** Pipeline stage shape — intentionally flexible to support varying stage configs */
const pipelineStageValidator = v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null()));

export const getPipeline = query({
  args: { executionId: v.string() },
  returns: v.union(
    v.object({
      executionId: v.string(),
      pipelineName: v.string(),
      status: v.string(),
      stages: v.array(pipelineStageValidator),
      envOverride: v.optional(v.record(v.string(), v.string())),
    }),
    v.null(),
  ),
  handler: async (_ctx, _args) => {
    return null;
  },
});

export const getPipelineStatus = query({
  args: { executionId: v.string() },
  returns: v.union(
    v.object({
      executionId: v.string(),
      pipelineName: v.string(),
      status: v.string(),
      startedAt: v.number(),
      completedAt: v.optional(v.number()),
      stages: v.array(pipelineStageValidator),
    }),
    v.null(),
  ),
  handler: async (_ctx, _args) => {
    return null;
  },
});

export const getPipelineLogs = query({
  args: { executionId: v.string() },
  /** Returns null (stub) — log entries have heterogeneous shapes */
  returns: v.union(v.array(v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null()))), v.null()),
  handler: async (_ctx, _args) => {
    return null;
  },
});

export const listPipelines = query({
  args: { projectId: v.optional(v.string()) },
  returns: v.array(
    v.object({
      executionId: v.string(),
      pipelineName: v.string(),
      status: v.string(),
      startedAt: v.number(),
      completedAt: v.optional(v.number()),
    }),
  ),
  handler: async (_ctx, _args) => {
    return [];
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
  returns: v.string(),
  handler: async (_ctx, _args) => {
    return 'stub-id';
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
  returns: v.null(),
  handler: async (_ctx, _args) => {
    return null;
  },
});
