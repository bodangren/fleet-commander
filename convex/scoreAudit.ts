import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';

const taskOutcome = v.union(
  v.literal('accepted'),
  v.literal('rework'),
  v.literal('rejected'),
  v.literal('regression'),
);

const scoreAuditEntry = v.object({
  dispatchedAt: v.number(),
  chosenTaskId: v.string(),
  candidatesJson: v.string(),
  breakdownJson: v.string(),
  justification: v.string(),
  weightsVersion: v.number(),
  llmTieBreak: v.boolean(),
  outcome: v.optional(taskOutcome),
  outcomeRecordedAt: v.optional(v.number()),
});

export const createScoreAudit = mutation({
  args: {
    chosenTaskId: v.string(),
    candidatesJson: v.string(),
    breakdownJson: v.string(),
    justification: v.string(),
    weightsVersion: v.number(),
    llmTieBreak: v.boolean(),
  },
  returns: scoreAuditEntry,
  handler: async (_ctx, args) => {
    return {
      dispatchedAt: Date.now(),
      chosenTaskId: args.chosenTaskId,
      candidatesJson: args.candidatesJson,
      breakdownJson: args.breakdownJson,
      justification: args.justification,
      weightsVersion: args.weightsVersion,
      llmTieBreak: args.llmTieBreak,
    };
  },
});

export const listScoreAuditByTask = query({
  args: { chosenTaskId: v.string(), limit: v.optional(v.number()) },
  returns: v.array(scoreAuditEntry),
  handler: async (_ctx, _args) => {
    return [];
  },
});

export const listRecentScoreAudit = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(scoreAuditEntry),
  handler: async (_ctx, _args) => {
    return [];
  },
});

export const listScoreAuditSince = query({
  args: { since: v.number(), limit: v.optional(v.number()) },
  returns: v.array(scoreAuditEntry),
  handler: async (_ctx, _args) => {
    return [] as any;
  },
});

export const recordOutcome = mutation({
  args: {
    chosenTaskId: v.string(),
    outcome: taskOutcome,
  },
  returns: v.null(),
  handler: async (_ctx, _args) => {
    return null;
  },
});

export const listScoreAuditWithOutcomes = query({
  args: { since: v.number(), limit: v.optional(v.number()) },
  returns: v.array(scoreAuditEntry),
  handler: async (_ctx, _args) => {
    return [];
  },
});
