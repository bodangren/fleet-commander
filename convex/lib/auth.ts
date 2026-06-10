import { ConvexError } from 'convex/values';
import type { QueryCtx, MutationCtx, ActionCtx } from '../_generated/server';

export type FleetActor = {
  subject: string;
  isAuthenticated: boolean;
};

type AnyCtx = QueryCtx | MutationCtx | ActionCtx;

/**
 * Resolves the authenticated Fleet actor for a Convex request.
 * @param ctx - Query, mutation, or action context
 * @returns Authenticated actor, or local-development bootstrap actor
 */
export async function resolveActor(ctx: AnyCtx): Promise<FleetActor> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    return {
      subject: identity.tokenIdentifier,
      isAuthenticated: true,
    };
  }

  if (process.env.NODE_ENV === 'production') {
    throw new ConvexError('Authentication required');
  }

  return {
    subject: 'anonymous-bootstrap',
    isAuthenticated: false,
  };
}
