import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { abTestStatus, abTestVariant, agentRole } from './lib/validators';
import { resolveActor } from './lib/auth';

const abTestResponse = v.object({
  _id: v.id('abTests'),
  name: v.string(),
  agentRole: agentRole,
  controlModel: v.string(),
  treatmentModel: v.string(),
  controlTemperature: v.optional(v.number()),
  treatmentTemperature: v.optional(v.number()),
  controlSystemPrompt: v.optional(v.string()),
  treatmentSystemPrompt: v.optional(v.string()),
  controlSkills: v.optional(v.array(v.string())),
  treatmentSkills: v.optional(v.array(v.string())),
  splitRatio: v.number(),
  status: abTestStatus,
  sprintId: v.optional(v.id('sprints')),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
});

export const listAbTestsHandler = query({
  args: {
    status: v.optional(abTestStatus),
    limit: v.optional(v.number()),
  },
  returns: v.array(abTestResponse),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    let docs = await ctx.db
      .query('abTests')
      .order('desc')
      .collect();

    if (args.status) {
      docs = docs.filter((d) => d.status === args.status);
    }

    if (args.limit != null) {
      docs = docs.slice(0, args.limit);
    }

    return docs.map((doc) => {
      const { _creationTime, ...rest } = doc as any;
      return rest;
    });
  },
});

export const getAbTestHandler = query({
  args: { id: v.id('abTests') },
  returns: v.union(v.null(), abTestResponse),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    const { _creationTime, ...rest } = doc as any;
    return rest;
  },
});

export const createAbTestHandler = mutation({
  args: {
    name: v.string(),
    agentRole: agentRole,
    controlModel: v.string(),
    treatmentModel: v.string(),
    controlTemperature: v.optional(v.number()),
    treatmentTemperature: v.optional(v.number()),
    controlSystemPrompt: v.optional(v.string()),
    treatmentSystemPrompt: v.optional(v.string()),
    controlSkills: v.optional(v.array(v.string())),
    treatmentSkills: v.optional(v.array(v.string())),
    splitRatio: v.number(),
    sprintId: v.optional(v.id('sprints')),
  },
  returns: v.id('abTests'),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const now = Date.now();
    return ctx.db.insert('abTests', {
      name: args.name,
      agentRole: args.agentRole,
      controlModel: args.controlModel,
      treatmentModel: args.treatmentModel,
      controlTemperature: args.controlTemperature,
      treatmentTemperature: args.treatmentTemperature,
      controlSystemPrompt: args.controlSystemPrompt,
      treatmentSystemPrompt: args.treatmentSystemPrompt,
      controlSkills: args.controlSkills,
      treatmentSkills: args.treatmentSkills,
      splitRatio: args.splitRatio,
      status: 'draft',
      sprintId: args.sprintId,
      createdAt: now,
    });
  },
});

export const updateAbTestStatusHandler = mutation({
  args: {
    id: v.id('abTests'),
    status: abTestStatus,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const patch: Record<string, unknown> = { status: args.status };
    if (args.status === 'completed') {
      patch.completedAt = Date.now();
    }
    await ctx.db.patch(args.id, patch);
    return null;
  },
});

export const deleteAbTestHandler = mutation({
  args: { id: v.id('abTests') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    await ctx.db.delete(args.id);
    return null;
  },
});

const experimentRunResponse = v.object({
  _id: v.id('experimentRuns'),
  experimentId: v.id('abTests'),
  variant: abTestVariant,
  taskDescription: v.string(),
  model: v.string(),
  agentRole: agentRole,
  cost: v.number(),
  durationMs: v.number(),
  output: v.string(),
  rejected: v.boolean(),
  similarityScore: v.optional(v.number()),
  startedAt: v.number(),
  completedAt: v.number(),
});

export const recordExperimentRunHandler = mutation({
  args: {
    experimentId: v.id('abTests'),
    variant: abTestVariant,
    taskDescription: v.string(),
    model: v.string(),
    agentRole: agentRole,
    cost: v.number(),
    durationMs: v.number(),
    output: v.string(),
    rejected: v.boolean(),
    similarityScore: v.optional(v.number()),
  },
  returns: v.id('experimentRuns'),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const now = Date.now();
    return ctx.db.insert('experimentRuns', {
      experimentId: args.experimentId,
      variant: args.variant,
      taskDescription: args.taskDescription,
      model: args.model,
      agentRole: args.agentRole,
      cost: args.cost,
      durationMs: args.durationMs,
      output: args.output,
      rejected: args.rejected,
      similarityScore: args.similarityScore,
      startedAt: now - args.durationMs,
      completedAt: now,
    });
  },
});

export const getExperimentResultsHandler = query({
  args: { experimentId: v.id('abTests') },
  returns: v.object({
    experiment: v.union(v.null(), abTestResponse),
    runs: v.array(experimentRunResponse),
    summary: v.object({
      controlAvgCost: v.number(),
      treatmentAvgCost: v.number(),
      controlAvgDuration: v.number(),
      treatmentAvgDuration: v.number(),
      controlRejectionRate: v.number(),
      treatmentRejectionRate: v.number(),
      avgSimilarity: v.number(),
      controlRuns: v.number(),
      treatmentRuns: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const experiment = await ctx.db.get(args.experimentId);
    const runs = await ctx.db
      .query('experimentRuns')
      .withIndex('by_experiment', (q) => q.eq('experimentId', args.experimentId))
      .collect();

    const controlRuns = runs.filter((r) => r.variant === 'control');
    const treatmentRuns = runs.filter((r) => r.variant === 'treatment');

    const avg = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
    const rejectionRate = (arr: typeof runs) =>
      arr.length ? arr.filter((r) => r.rejected).length / arr.length : 0;
    const similarityScores = runs
      .filter((r) => r.similarityScore != null)
      .map((r) => r.similarityScore!);

    return {
      experiment: experiment
        ? (() => {
            const { _creationTime, ...rest } = experiment as any;
            return rest;
          })()
        : null,
      runs: runs.map((r) => {
        const { _creationTime, ...rest } = r as any;
        return rest;
      }),
      summary: {
        controlAvgCost: Math.round(avg(controlRuns.map((r) => r.cost)) * 100) / 100,
        treatmentAvgCost: Math.round(avg(treatmentRuns.map((r) => r.cost)) * 100) / 100,
        controlAvgDuration: Math.round(avg(controlRuns.map((r) => r.durationMs))),
        treatmentAvgDuration: Math.round(avg(treatmentRuns.map((r) => r.durationMs))),
        controlRejectionRate: Math.round(rejectionRate(controlRuns) * 100) / 100,
        treatmentRejectionRate: Math.round(rejectionRate(treatmentRuns) * 100) / 100,
        avgSimilarity: Math.round(avg(similarityScores) * 100) / 100,
        controlRuns: controlRuns.length,
        treatmentRuns: treatmentRuns.length,
      },
    };
  },
});
