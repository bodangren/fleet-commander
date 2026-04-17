import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';

const scoreAuditEntry = v.object({
  dispatchedAt: v.number(),
  chosenTaskId: v.string(),
  candidatesJson: v.string(),
  breakdownJson: v.string(),
  justification: v.string(),
  weightsVersion: v.number(),
  llmTieBreak: v.boolean(),
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
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const entry = {
      dispatchedAt: Date.now(),
      chosenTaskId: args.chosenTaskId,
      candidatesJson: args.candidatesJson,
      breakdownJson: args.breakdownJson,
      justification: args.justification,
      weightsVersion: args.weightsVersion,
      llmTieBreak: args.llmTieBreak,
    };
    await ctx.db.insert('scoreAudit', entry);
    return entry;
  },
});

export const listScoreAuditByTask = query({
  args: { chosenTaskId: v.string(), limit: v.optional(v.number()) },
  returns: v.array(scoreAuditEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const docs = await ctx.db
      .query('scoreAudit')
      .withIndex('by_chosen_task', (q) => q.eq('chosenTaskId', args.chosenTaskId))
      .order('desc')
      .take(args.limit ?? 50);
    return docs.map((doc) => ({
      dispatchedAt: doc.dispatchedAt,
      chosenTaskId: doc.chosenTaskId,
      candidatesJson: doc.candidatesJson,
      breakdownJson: doc.breakdownJson,
      justification: doc.justification,
      weightsVersion: doc.weightsVersion,
      llmTieBreak: doc.llmTieBreak,
    }));
  },
});

export const listRecentScoreAudit = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(scoreAuditEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const docs = await ctx.db
      .query('scoreAudit')
      .withIndex('by_dispatched_at')
      .order('desc')
      .take(args.limit ?? 50);
    return docs.map((doc) => ({
      dispatchedAt: doc.dispatchedAt,
      chosenTaskId: doc.chosenTaskId,
      candidatesJson: doc.candidatesJson,
      breakdownJson: doc.breakdownJson,
      justification: doc.justification,
      weightsVersion: doc.weightsVersion,
      llmTieBreak: doc.llmTieBreak,
    }));
  },
});

export const listScoreAuditSince = query({
  args: { since: v.number(), limit: v.optional(v.number()) },
  returns: v.array(scoreAuditEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const docs = await ctx.db
      .query('scoreAudit')
      .withIndex('by_dispatched_at', (q) => q.gte('dispatchedAt', args.since))
      .order('asc')
      .take(args.limit ?? 1000);
    return docs.map((doc) => ({
      dispatchedAt: doc.dispatchedAt,
      chosenTaskId: doc.chosenTaskId,
      candidatesJson: doc.candidatesJson,
      breakdownJson: doc.breakdownJson,
      justification: doc.justification,
      weightsVersion: doc.weightsVersion,
      llmTieBreak: doc.llmTieBreak,
    }));
  },
});
