/**
 * Phase 1 Red tests for FR-4 — trigger route HTTP status semantics.
 *
 * `POST /api/pipelines/:name/trigger` currently returns HTTP 500 for every
 * error (`pivot/src/routes/pipelines.ts:146-149`). FR-4 requires:
 *   - Client/validation errors (e.g., bad input surfaced by `runPipeline`
 *     via a duck-typed `ValidationError`/`Invalid ...` message) → 4xx.
 *   - Convex persistence failures → 5xx (preserved from prior track).
 *
 * Naming: `*.regression.test.ts` per FR-8 / prior-track convention so the
 * S5 closeout guard (`zero *.red.test.ts files`) does not delete this
 * evidence. These tests become permanent regression guards once the fix
 * ships; they MUST still fail when the fix is reverted.
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Router } from './router.js';
import { registerPipelineRoutes } from './pipelines.js';

const PIPELINES_PATH = join(process.cwd(), 'conductor', 'pipelines.yml');

function writePipelinesYaml(content: string): void {
  writeFileSync(PIPELINES_PATH, content, 'utf-8');
}

/**
 * Builds a mock client whose `mutation` is selectively controllable so
 * the test can simulate "Convex persistence throws" vs. "runPipeline throws".
 */
function makeControllableClient(opts: {
  mutation?: (args: Record<string, unknown>) => Promise<unknown>;
  query?: (args: Record<string, unknown>) => Promise<unknown>;
}) {
  const mutation = opts.mutation ?? (async () => 'pipelineRuns:placeholder00000000000000000');
  const query = opts.query ?? (async () => []);
  return {
    mutation: mock(async (_fn: unknown, args: Record<string, unknown>) => mutation(args)),
    query: mock(async (_fn: unknown, args: Record<string, unknown>) => query(args)),
  };
}

describe('Pipeline trigger route — HTTP status semantics (FR-4)', () => {
  afterEach(() => {
    if (existsSync(PIPELINES_PATH)) {
      rmSync(PIPELINES_PATH);
    }
  });

  beforeEach(() => {
    if (existsSync(PIPELINES_PATH)) {
      rmSync(PIPELINES_PATH);
    }
  });

  it('returns 4xx for a runPipeline client/validation error (bad pipeline name)', async () => {
    // Don't write a pipelines.yml → findPipeline returns null → the route
    // returns 404 not_found (which is 4xx). This is the lowest-friction
    // way to drive a 4xx at the boundary while still exercising the
    // dispatcher's error handling.
    const client = makeControllableClient({});
    const router = new Router();
    registerPipelineRoutes(router, client as any);

    const response = await router
      .match('POST', '/api/pipelines/does-not-exist/trigger')!
      .handler(
        new Request('http://localhost/api/pipelines/does-not-exist/trigger', {
          method: 'POST',
        }),
        { name: 'does-not-exist' },
      );

    // The "pipeline not found" branch is a 404 (4xx), which already passes.
    // This test guards against future refactors that might surface a 5xx
    // for client errors.
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });

  it('returns 5xx for a Convex persistence failure (does not swallow)', async () => {
    writePipelinesYaml(`pipelines:
  - name: fr4-persist-fail
    trigger: manual
    stages:
      - name: build
        steps:
          - name: compile
            command: echo ok
`);

    // Force every mutation to throw — simulates Convex rejection.
    const client = makeControllableClient({
      mutation: async () => {
        throw new Error('Convex validation failed');
      },
    });
    const router = new Router();
    registerPipelineRoutes(router, client as any);

    const response = await router
      .match('POST', '/api/pipelines/fr4-persist-fail/trigger')!
      .handler(
        new Request('http://localhost/api/pipelines/fr4-persist-fail/trigger', {
          method: 'POST',
        }),
        { name: 'fr4-persist-fail' },
      );

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(response.status).toBeLessThan(600);
  });

  it('returns 4xx when runPipeline throws a validation-style client error (circular dependency)', async () => {
    // The FR-4 contract requires that client/validation errors from
    // runPipeline surface as 4xx. The route catches every error and
    // returns 500 at HEAD; this test will fail until the route
    // distinguishes client errors (duck-typed via a validation error
    // class or message starting with "Circular dependency"/"Invalid")
    // from server errors.
    //
    // We drive a real client error via circular step dependencies:
    // `runPipeline` -> `executeStage` -> `resolveStepOrder` throws
    // `Error: Circular dependency detected: <stepName>`. This is a
    // validation-style failure caused by malformed user input (the
    // pipelines.yml), so it should surface as 4xx, not 5xx.
    writePipelinesYaml(`pipelines:
  - name: fr4-validation-fail
    trigger: manual
    stages:
      - name: build
        steps:
          - name: compile
            command: echo ok
            depends_on:
              - package
          - name: package
            command: echo ok
            depends_on:
              - compile
`);

    const client = makeControllableClient({});
    const router = new Router();
    registerPipelineRoutes(router, client as any);

    const response = await router
      .match('POST', '/api/pipelines/fr4-validation-fail/trigger')!
      .handler(
        new Request('http://localhost/api/pipelines/fr4-validation-fail/trigger', {
          method: 'POST',
        }),
        { name: 'fr4-validation-fail' },
      );

    // HEAD: returns 500 (catch-all swallows runPipeline errors). After
    // fix: returns 4xx (client error from a validation-style failure).
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });
});
