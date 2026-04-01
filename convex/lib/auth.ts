import type { QueryCtx, MutationCtx, ActionCtx } from '../_generated/server';

export type FleetActor = {
  subject: string;
  isAuthenticated: boolean;
};

type AnyCtx = QueryCtx | MutationCtx | ActionCtx;

export async function resolveActor(ctx: AnyCtx): Promise<FleetActor> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    return {
      subject: identity.subject,
      isAuthenticated: true,
    };
  }

  // Bootstrap mode: allow local development without auth provider wiring.
  return {
    subject: 'anonymous-bootstrap',
    isAuthenticated: false,
  };
}
