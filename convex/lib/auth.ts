import { ConvexError } from 'convex/values';
import type { QueryCtx, MutationCtx, ActionCtx } from '../_generated/server';

export type FleetActor = {
  subject: string;
  isAuthenticated: boolean;
};

type AnyCtx = QueryCtx | MutationCtx | ActionCtx;

type FleetEnv = {
  NODE_ENV?: string;
  FLEET_ALLOW_ANON_BOOTSTRAP?: string;
};

function readFleetEnv(): FleetEnv {
  return (
    (globalThis as { process?: { env?: FleetEnv } }).process?.env ?? {}
  );
}

/**
 * Resolves the authenticated Fleet actor for a Convex request.
 *
 * Production requests require a valid Convex identity; the anonymous
 * bootstrap fallback is only permitted in non-production environments
 * and only when the explicit opt-in flag `FLEET_ALLOW_ANON_BOOTSTRAP=1`
 * is set. Any other unauthenticated request is rejected with
 * `Authentication required`.
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

  const env = readFleetEnv();
  const isProduction = env.NODE_ENV === 'production';
  const allowAnon = env.FLEET_ALLOW_ANON_BOOTSTRAP === '1';

  if (allowAnon && !isProduction) {
    return {
      subject: 'anonymous-bootstrap',
      isAuthenticated: false,
    };
  }

  throw new ConvexError('Authentication required');
}
