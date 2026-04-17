import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';

const simulationRunEntry = v.object({
  windowDays: v.number(),
  candidateWeightsJson: v.string(),
  candidateRulesJson: v.string(),
  reportJson: v.string(),
  createdAt: v.number(),
});

export const createSimulationRun = mutation({
  args: {
    windowDays: v.number(),
    candidateWeightsJson: v.string(),
    candidateRulesJson: v.string(),
    reportJson: v.string(),
  },
  returns: simulationRunEntry,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const entry = {
      windowDays: args.windowDays,
      candidateWeightsJson: args.candidateWeightsJson,
      candidateRulesJson: args.candidateRulesJson,
      reportJson: args.reportJson,
      createdAt: Date.now(),
    };
    await ctx.db.insert('simulationRuns', entry);
    return entry;
  },
});

export const getSimulationRun = query({
  args: { id: v.id('simulationRuns') },
  returns: v.union(simulationRunEntry, v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    return {
      windowDays: doc.windowDays,
      candidateWeightsJson: doc.candidateWeightsJson,
      candidateRulesJson: doc.candidateRulesJson,
      reportJson: doc.reportJson,
      createdAt: doc.createdAt,
    };
  },
});

export const listSimulationRuns = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(simulationRunEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const docs = await ctx.db
      .query('simulationRuns')
      .withIndex('by_created_at')
      .order('desc')
      .take(args.limit ?? 50);
    return docs.map((doc) => ({
      windowDays: doc.windowDays,
      candidateWeightsJson: doc.candidateWeightsJson,
      candidateRulesJson: doc.candidateRulesJson,
      reportJson: doc.reportJson,
      createdAt: doc.createdAt,
    }));
  },
});

export const deleteSimulationRun = mutation({
  args: { id: v.id('simulationRuns') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    await ctx.db.delete(args.id);
    return null;
  },
});
