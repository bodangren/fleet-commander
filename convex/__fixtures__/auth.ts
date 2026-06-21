import { afterEach } from 'bun:test';

/**
 * Creates a minimal Convex context for auth unit tests.
 * @param identity - Value returned by `ctx.auth.getUserIdentity`
 */
export function createCtx(identity: unknown) {
  return {
    auth: {
      getUserIdentity: async () => identity,
    },
  } as any;
}

const originalNodeEnv = process.env.NODE_ENV;
const originalAllowAnon = process.env.FLEET_ALLOW_ANON_BOOTSTRAP;
const originalProviderDomain = process.env.CONVEX_AUTH_PROVIDER_DOMAIN;
const originalApplicationId = process.env.CONVEX_AUTH_APPLICATION_ID;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  process.env.FLEET_ALLOW_ANON_BOOTSTRAP = originalAllowAnon;
  process.env.CONVEX_AUTH_PROVIDER_DOMAIN = originalProviderDomain;
  process.env.CONVEX_AUTH_APPLICATION_ID = originalApplicationId;
});

/**
 * Sets `NODE_ENV` for the current test.
 * @param value - The environment value to set
 */
export function withNodeEnv(value: string) {
  process.env.NODE_ENV = value;
}

/**
 * Sets or clears the auth provider environment variables.
 * @param opts - Optional domain and application ID
 */
export function withAuthEnv(opts: { domain?: string; applicationID?: string }) {
  if (opts.domain !== undefined) {
    process.env.CONVEX_AUTH_PROVIDER_DOMAIN = opts.domain;
  } else {
    delete process.env.CONVEX_AUTH_PROVIDER_DOMAIN;
  }
  if (opts.applicationID !== undefined) {
    process.env.CONVEX_AUTH_APPLICATION_ID = opts.applicationID;
  } else {
    delete process.env.CONVEX_AUTH_APPLICATION_ID;
  }
}

/**
 * Dynamically imports the auth config module with a cache-busting query so
 * provider env vars are re-evaluated for each call.
 */
export async function loadAuthConfig() {
  const path = import.meta.resolve('../auth.config.ts');
  return import(`${path}?bust=${Date.now()}`);
}
