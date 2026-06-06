import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';
import { reconciliationArtifactType, reconciliationProposalStatus, reconciliationSourceSide } from './lib/validators';

const proposalStatus = reconciliationProposalStatus;
const artifactType = reconciliationArtifactType;
const sourceSide = reconciliationSourceSide;

const reconciliationProposalEntry = v.object({
  projectSlug: v.string(),
  artifactType,
  artifactId: v.string(),
  patchJson: v.string(),
  sourceSide,
  reason: v.string(),
  status: proposalStatus,
  eventId: v.optional(v.string()),
  createdAt: v.number(),
  resolvedAt: v.optional(v.number()),
});

export const createProposal = mutation({
  args: {
    projectSlug: v.string(),
    artifactType,
    artifactId: v.string(),
    patchJson: v.string(),
    sourceSide,
    reason: v.string(),
    eventId: v.optional(v.string()),
  },
  returns: reconciliationProposalEntry,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query('reconciliationProposals')
      .withIndex('by_artifact', (q) =>
        q.eq('artifactType', args.artifactType).eq('artifactId', args.artifactId)
      )
      .filter((q) => q.eq(q.field('status'), 'pending'))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        patchJson: args.patchJson,
        sourceSide: args.sourceSide,
        reason: args.reason,
        eventId: args.eventId,
      });
      return { ...existing, patchJson: args.patchJson, sourceSide: args.sourceSide, reason: args.reason, eventId: args.eventId };
    }

    const entry = {
      projectSlug: args.projectSlug,
      artifactType: args.artifactType,
      artifactId: args.artifactId,
      patchJson: args.patchJson,
      sourceSide: args.sourceSide,
      reason: args.reason,
      status: 'pending' as const,
      eventId: args.eventId,
      createdAt: now,
    };

    await ctx.db.insert('reconciliationProposals', entry);
    return entry;
  },
});

export const getProposal = query({
  args: { id: v.string() },
  returns: v.union(v.null(), reconciliationProposalEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db.get(args.id as any);
    if (!doc) return null;
    return doc as any;
  },
});

export const listPendingProposals = query({
  args: {
    projectSlug: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(reconciliationProposalEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const docs = await ctx.db
      .query('reconciliationProposals')
      .withIndex('by_project_and_status', (q) =>
        q.eq('projectSlug', args.projectSlug).eq('status', 'pending')
      )
      .order('desc')
      .take(args.limit ?? 50);
    return docs;
  },
});

export const listProposalsByArtifact = query({
  args: {
    artifactType,
    artifactId: v.string(),
  },
  returns: v.array(reconciliationProposalEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const docs = await ctx.db
      .query('reconciliationProposals')
      .withIndex('by_artifact', (q) =>
        q.eq('artifactType', args.artifactType).eq('artifactId', args.artifactId)
      )
      .order('desc')
      .take(50);
    return docs;
  },
});

export const resolveProposal = mutation({
  args: {
    id: v.string(),
    status: reconciliationProposalStatus,
  },
  returns: v.union(v.null(), reconciliationProposalEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db.get(args.id as any);
    if (!doc) return null;

    const now = Date.now();
    await ctx.db.patch(doc._id, {
      status: args.status,
      resolvedAt: now,
    });

    return { ...doc, status: args.status, resolvedAt: now } as any;
  },
});
