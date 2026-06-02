import { afterEach, describe, expect, it } from 'bun:test';
import { resolveActor } from './auth';

function createCtx(identity: unknown) {
  return {
    auth: {
      getUserIdentity: async () => identity,
    },
  } as any;
}

describe('resolveActor', () => {
  const previousNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = previousNodeEnv;
  });

  it('returns authenticated actors from Convex identity', async () => {
    process.env.NODE_ENV = 'production';

    const actor = await resolveActor(createCtx({ tokenIdentifier: 'issuer|user-1', subject: 'user-1' }));

    expect(actor).toEqual({ subject: 'issuer|user-1', isAuthenticated: true });
  });

  it('rejects unauthenticated production requests', async () => {
    process.env.NODE_ENV = 'production';

    await expect(resolveActor(createCtx(null))).rejects.toThrow('Authentication required');
  });

  it('allows anonymous bootstrap only in development', async () => {
    process.env.NODE_ENV = 'development';

    const actor = await resolveActor(createCtx(null));

    expect(actor).toEqual({ subject: 'anonymous-bootstrap', isAuthenticated: false });
  });
});
