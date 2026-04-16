import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { resolveActor } from './lib/auth';

const proposalStatus = v.union(v.literal('pending'), v.literal('applied'), v.literal('rejected'));
const artifactType = v.union(v.literal('track'), v.literal('task'), v.literal('issue'));
const sourceSide = v.union(v.literal('convex'), v.literal('markdown'));

export const batchApplyProposals = mutation({
  args: {
    proposals: v.array(v.object({
      projectSlug: v.string(),
      artifactType,
      artifactId: v.string(),
      patchJson: v.string(),
      sourceSide,
      reason: v.string(),
      autoApply: v.boolean(),
      conductorHash: v.string(),
      canonicalHash: v.string(),
      eventId: v.optional(v.string()),
    })),
  },
  returns: v.object({
    created: v.number(),
    applied: v.number(),
    rejected: v.number(),
  }),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const now = Date.now();
    let created = 0;
    let applied = 0;
    let rejected = 0;

    for (const proposal of args.proposals) {
      // Skip if a decision already exists for this hash pair
      const existingDecision = await ctx.db
        .query('reconciliationDecisions')
        .withIndex('by_hashes', (q) =>
          q.eq('conductorHash', proposal.conductorHash).eq('canonicalHash', proposal.canonicalHash)
        )
        .first();

      if (existingDecision) {
        if (existingDecision.decision === 'reject') {
          rejected++;
          continue;
        }
      }

      const status: 'pending' | 'applied' | 'rejected' = proposal.autoApply ? 'applied' : 'pending';

      const existingProposal = await ctx.db
        .query('reconciliationProposals')
        .withIndex('by_artifact', (q) =>
          q.eq('artifactType', proposal.artifactType).eq('artifactId', proposal.artifactId)
        )
        .filter((q) => q.eq(q.field('status'), 'pending'))
        .first();

      let proposalId: string;

      if (existingProposal) {
        await ctx.db.patch(existingProposal._id, {
          patchJson: proposal.patchJson,
          sourceSide: proposal.sourceSide,
          reason: proposal.reason,
          status,
          resolvedAt: status === 'applied' ? now : undefined,
        });
        proposalId = existingProposal._id as string;
      } else {
        proposalId = await ctx.db.insert('reconciliationProposals', {
          projectSlug: proposal.projectSlug,
          artifactType: proposal.artifactType,
          artifactId: proposal.artifactId,
          patchJson: proposal.patchJson,
          sourceSide: proposal.sourceSide,
          reason: proposal.reason,
          status,
          eventId: proposal.eventId,
          createdAt: now,
          resolvedAt: status === 'applied' ? now : undefined,
        });
      }

      created++;

      if (proposal.autoApply) {
        applied++;
        // Record an apply decision for dedup
        await ctx.db.insert('reconciliationDecisions', {
          proposalId,
          decision: 'apply',
          conductorHash: proposal.conductorHash,
          canonicalHash: proposal.canonicalHash,
          createdAt: now,
        });

        // Clear the corresponding reconciliation event if eventId provided
        if (proposal.eventId) {
          const event = await ctx.db.get(proposal.eventId as any);
          if (event) {
            await ctx.db.delete(event._id);
          }
        }
      }
    }

    return { created, applied, rejected };
  },
});
