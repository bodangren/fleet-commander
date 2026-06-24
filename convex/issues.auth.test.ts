import { afterEach, describe, expect, it } from 'bun:test';
import { listIssuesByProject } from './issues';
import { createMockCtx } from './__fixtures__/foundation';

const originalNodeEnv = process.env.NODE_ENV;
const originalAllowAnon = process.env.FLEET_ALLOW_ANON_BOOTSTRAP;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  process.env.FLEET_ALLOW_ANON_BOOTSTRAP = originalAllowAnon;
});

/**
 * Integration test: a protected Convex handler must reject callers that have
 * no auth identity, in production and in development when the anon bootstrap
 * opt-in flag is not set. This complements the unit tests in
 * `convex/lib/auth.test.ts` by exercising the handler's full auth gate path
 * against `createMockCtx` (the shared foundation fixture).
 */
describe('issues handler auth gate', () => {
  it('rejects unauthenticated callers under NODE_ENV=production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.FLEET_ALLOW_ANON_BOOTSTRAP;

    const ctx = createMockCtx();
    const handler = (listIssuesByProject as unknown as { _handler: Function })._handler;

    await expect(handler(ctx, { projectSlug: 'demo' })).rejects.toThrow('Authentication required');
  });

  it('rejects unauthenticated callers in development without the opt-in flag', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.FLEET_ALLOW_ANON_BOOTSTRAP;

    const ctx = createMockCtx();
    const handler = (listIssuesByProject as unknown as { _handler: Function })._handler;

    await expect(handler(ctx, { projectSlug: 'demo' })).rejects.toThrow('Authentication required');
  });
});