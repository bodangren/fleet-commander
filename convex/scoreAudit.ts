import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { MutationCtx } from './_generated/server';
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

export type CreateScoreAuditArgs = {
  chosenTaskId: string;
  candidatesJson: string;
  breakdownJson: string;
  justification: string;
  weightsVersion: number;
  llmTieBreak: boolean;
};

/**
 * Persists a score-audit row for a dispatch decision.
 * @param ctx - Convex mutation context
 * @param args - Score-audit payload produced by dispatch selection
 * @returns Persisted score-audit entry
 */
export async function createScoreAuditHandler(ctx: MutationCtx, args: CreateScoreAuditArgs) {
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
}

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
  handler: createScoreAuditHandler,
});

export const listScoreAuditByTask = query({
  args: { chosenTaskId: v.string(), limit: v.optional(v.number()) },
  returns: v.array(scoreAuditEntry),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    return ctx.db
      .query('scoreAudit')
      .withIndex('by_task', (q) => q.eq('chosenTaskId', args.chosenTaskId))
      .order('desc')
      .take(limit);
  },
});

export const listRecentScoreAudit = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(scoreAuditEntry),
  handler: async (ctx, args) => {
    return ctx.db
      .query('scoreAudit')
      .withIndex('by_dispatched_at')
      .order('desc')
      .take(args.limit ?? 100);
  },
});

export const listScoreAuditSince = query({
  args: { since: v.number(), limit: v.optional(v.number()) },
  returns: v.array(scoreAuditEntry),
  handler: async (ctx, args) => {
    return ctx.db
      .query('scoreAudit')
      .withIndex('by_dispatched_at', (q) => q.gte('dispatchedAt', args.since))
      .order('desc')
      .take(args.limit ?? 100);
  },
});

export const recordOutcome = mutation({
  args: {
    chosenTaskId: v.string(),
    outcome: taskOutcome,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const audit = await ctx.db
      .query('scoreAudit')
      .withIndex('by_task', (q) => q.eq('chosenTaskId', args.chosenTaskId))
      .order('desc')
      .first();
    if (!audit) return null;
    await ctx.db.patch(audit._id, {
      outcome: args.outcome,
      outcomeRecordedAt: Date.now(),
    });
    return null;
  },
});

export const listScoreAuditWithOutcomes = query({
  args: { since: v.number(), limit: v.optional(v.number()) },
  returns: v.array(scoreAuditEntry),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('scoreAudit')
      .withIndex('by_dispatched_at', (q) => q.gte('dispatchedAt', args.since))
      .order('desc')
      .take(args.limit ?? 100);
    return rows.filter((row) => row.outcome !== undefined);
  },
});
