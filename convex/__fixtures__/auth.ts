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

/**
 * Restores every environment variable these fixtures mutate.
 * Register it yourself: `afterEach(restoreAuthEnv)`.
 */
export function restoreAuthEnv(): void {
  process.env.NODE_ENV = originalNodeEnv;
  process.env.FLEET_ALLOW_ANON_BOOTSTRAP = originalAllowAnon;
  process.env.CONVEX_AUTH_PROVIDER_DOMAIN = originalProviderDomain;
  process.env.CONVEX_AUTH_APPLICATION_ID = originalApplicationId;
}

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
 * Dynamically imports the auth config module with a fresh module instance per
 * call so provider env vars are re-evaluated for each test.
 *
 * Bun's test runner caches modules aggressively even when the URL has a
 * cache-busting query string, so we read the source and load it through a
 * unique blob URL to force a fresh evaluation.
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
