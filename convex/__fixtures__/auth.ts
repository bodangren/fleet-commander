/**
 * Auth test fixtures.
 *
 * This file lives under `convex/`, which Convex bundles as function modules.
 * It therefore must not import `bun:test`: esbuild cannot resolve that
 * specifier, and a single unresolvable import fails the whole bundle. That
 * broke `bunx convex codegen` — and with it the CI "Schema Check" job, which
 * runs `convex codegen --init` and diffs `convex/_generated/`.
 *
 * The environment restore that used to run in a module-level `afterEach` is now
 * the exported `restoreAuthEnv`, which callers register themselves.
 */

/**
 * Module-scoped declaration of the one global this fixture touches.
 *
 * Dropping the `bun:test` import also dropped the ambient Bun types it pulled
 * in, and the frontend tsconfig — which reaches this file through the convex
 * tree — has no Node types. Declaring the shape here keeps the fixture
 * typechecking under every tsconfig in the workspace without adding a
 * dependency to any of them.
 */
declare const process: { env: Record<string, string | undefined> };

/** Only the one Bun API this fixture uses, declared for the same reason. */
declare const Bun: { file(path: string): { text(): Promise<string> } };

const authenticatedTestIdentity = {
  tokenIdentifier: 'test-user',
  subject: 'test-user',
  issuer: 'https://auth.test.fleet-commander.local',
};

/**
 * Creates a minimal Convex context for auth unit tests.
 * @param identity - Value returned by `ctx.auth.getUserIdentity`
 * @returns A context exposing the supplied identity through Convex auth.
 */
export function createCtx(identity: unknown) {
  return {
    auth: {
      getUserIdentity: async () => identity,
    },
  } as any;
}

/**
 * Attaches a stable authenticated identity to a direct-handler test context.
 *
 * @param ctx - Context whose auth implementation should be replaced.
 * @returns The original context with an authenticated `getUserIdentity` stub.
 */
export function withAuthenticatedIdentity<T extends object>(ctx: T): T {
  const context = ctx as T & { auth?: Record<string, unknown> };
  context.auth = {
    ...context.auth,
    getUserIdentity: async () => authenticatedTestIdentity,
  };
  return ctx;
}

const originalNodeEnv = process.env.NODE_ENV;
const originalAllowAnon = process.env.FLEET_ALLOW_ANON_BOOTSTRAP;
const originalProviderDomain = process.env.CONVEX_AUTH_PROVIDER_DOMAIN;
const originalApplicationId = process.env.CONVEX_AUTH_APPLICATION_ID;

/**
 * Sets or clears `NODE_ENV` without assigning to a bundler-defined property.
 *
 * @param value - Environment value to restore or apply.
 * @returns Nothing.
 */
function setNodeEnv(value: string | undefined): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, 'NODE_ENV');
  } else {
    Reflect.set(process.env, 'NODE_ENV', value);
  }
}

/**
 * Restores every environment variable these fixtures mutate.
 * Register it yourself: `afterEach(restoreAuthEnv)`.
 * @returns Nothing.
 */
export function restoreAuthEnv(): void {
  setNodeEnv(originalNodeEnv);
  process.env.FLEET_ALLOW_ANON_BOOTSTRAP = originalAllowAnon;
  process.env.CONVEX_AUTH_PROVIDER_DOMAIN = originalProviderDomain;
  process.env.CONVEX_AUTH_APPLICATION_ID = originalApplicationId;
}

/**
 * Sets `NODE_ENV` for the current test.
 * @param value - The environment value to set
 * @returns Nothing.
 */
export function withNodeEnv(value: string): void {
  setNodeEnv(value);
}

/**
 * Sets or clears the auth provider environment variables.
 * @param opts - Optional domain and application ID
 * @returns Nothing.
 */
export function withAuthEnv(opts: { domain?: string; applicationID?: string }): void {
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
 * Dynamically imports the auth config module with a fresh module instance per
 * call so provider env vars are re-evaluated for each test.
 *
 * Bun's test runner caches modules aggressively even when the URL has a
 * cache-busting query string, so we read the source and load it through a
 * unique blob URL to force a fresh evaluation.
 * @returns The freshly evaluated auth config module.
 */
export async function loadAuthConfig() {
  const path = import.meta.resolve('../auth.config.ts');
  const filePath = path.startsWith('file://') ? path.slice('file://'.length) : path;
  const source = await Bun.file(filePath).text();
  const blob = new Blob([source], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  try {
    return await import(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
