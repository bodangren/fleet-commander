import { afterEach, describe, expect, it } from 'bun:test';
import { createCtx, restoreAuthEnv, withNodeEnv } from '../__fixtures__/auth';
import { resolveActor } from './auth';

afterEach(restoreAuthEnv);

describe('resolveActor', () => {
  it('returns authenticated actors from Convex identity', async () => {
    withNodeEnv('production');

    const actor = await resolveActor(createCtx({ tokenIdentifier: 'issuer|user-1', subject: 'user-1' }));

    expect(actor).toEqual({ subject: 'issuer|user-1', isAuthenticated: true });
  });

  it('rejects unauthenticated production requests', async () => {
    withNodeEnv('production');

    await expect(resolveActor(createCtx(null))).rejects.toThrow('Authentication required');
  });

  it('allows anonymous bootstrap only with explicit opt-in flag', async () => {
    withNodeEnv('development');
    process.env.FLEET_ALLOW_ANON_BOOTSTRAP = '1';

    const actor = await resolveActor(createCtx(null));

    expect(actor).toEqual({ subject: 'anonymous-bootstrap', isAuthenticated: false });
  });

  it('rejects anonymous bootstrap without the opt-in flag even in development', async () => {
    withNodeEnv('development');
    delete process.env.FLEET_ALLOW_ANON_BOOTSTRAP;

    await expect(resolveActor(createCtx(null))).rejects.toThrow('Authentication required');
  });
});
