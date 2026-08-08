import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for Convex runtime suites.
 *
 * Convex functions run in an edge-compatible runtime. Keeping this config
 * separate from the frontend jsdom config also lets Bun continue owning the
 * existing `*.test.ts` suites.
 */
export default defineConfig({
  test: {
    environment: 'edge-runtime',
    include: ['convex/**/*.convex-test.ts'],
    testTimeout: 30_000,
  },
});
