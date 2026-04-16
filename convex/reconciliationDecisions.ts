import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';

const decisionType = v.union(v.literal('apply'), v.literal('reject'));

const reconciliationDecisionEntry = v.object({
  proposalId: v.string(),
  decision: decisionType,
  reason: v.optional(v.string()),
  conductorHash: v.string(),
  canonicalHash: v.string(),
  createdAt: v.number(),
});

export const recordDecision = mutation({
  args: {
    proposalId: v.string(),
    decision: decisionType,
    reason: v.optional(v.string()),
    conductorHash: v.string(),
    canonicalHash: v.string(),
  },
  returns: reconciliationDecisionEntry,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const now = Date.now();

    const entry = {
      proposalId: args.proposalId,
      decision: args.decision,
      reason: args.reason,
      conductorHash: args.conductorHash,
      canonicalHash: args.canonicalHash,
      createdAt: now,
    };

    await ctx.db.insert('reconciliationDecisions', entry);
    return entry;
  },
});

export const getDecisionByProposal = query({
  args: { proposalId: v.string() },
  returns: v.union(v.null(), reconciliationDecisionEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('reconciliationDecisions')
      .withIndex('by_proposal', (q) => q.eq('proposalId', args.proposalId))
      .first();
    return doc ?? null;
  },
});

export const getDecisionByHashes = query({
  args: {
    conductorHash: v.string(),
    canonicalHash: v.string(),
  },
  returns: v.union(v.null(), reconciliationDecisionEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('reconciliationDecisions')
      .withIndex('by_hashes', (q) =>
        q.eq('conductorHash', args.conductorHash).eq('canonicalHash', args.canonicalHash)
      )
      .first();
    return doc ?? null;
  },
});

export const listDecisions = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(reconciliationDecisionEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const docs = await ctx.db
      .query('reconciliationDecisions')
      .order('desc')
      .take(args.limit ?? 50);
    return docs;
  },
});
