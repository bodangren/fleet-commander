import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';

const dispatchPolicyStatsEntry = v.object({
  persona: v.string(),
  taskKind: v.string(),
  repoType: v.string(),
  meanDurationMs: v.optional(v.number()),
  p50Cost: v.number(),
  p90Cost: v.number(),
  reviewFailRate: v.number(),
  retryRate: v.number(),
  blockerCreationRate: v.number(),
  coverageRegressionRate: v.number(),
  sampleCount: v.number(),
  windowDays: v.number(),
  insufficientData: v.boolean(),
  lastUpdatedAt: v.number(),
});

export const upsertDispatchPolicyStats = mutation({
  args: {
    persona: v.string(),
    taskKind: v.string(),
    repoType: v.string(),
    meanDurationMs: v.optional(v.number()),
    p50Cost: v.number(),
    p90Cost: v.number(),
    reviewFailRate: v.number(),
    retryRate: v.number(),
    blockerCreationRate: v.number(),
    coverageRegressionRate: v.number(),
    sampleCount: v.number(),
    windowDays: v.number(),
    insufficientData: v.boolean(),
    lastUpdatedAt: v.number(),
  },
  returns: dispatchPolicyStatsEntry,
  handler: async (_ctx, args) => {
    return args;
  },
});

export const getDispatchPolicyStats = query({
  args: {
    persona: v.string(),
    taskKind: v.string(),
    repoType: v.string(),
  },
  returns: v.union(dispatchPolicyStatsEntry, v.null()),
  handler: async (_ctx, _args) => {
    return null;
  },
});

export const listDispatchPolicyStats = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(dispatchPolicyStatsEntry),
  handler: async (_ctx, _args) => {
    return [];
  },
});
