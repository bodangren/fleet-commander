/**
 * Phase 5 regression tests for pipeline route boundary contracts.
 *
 * Per spec.md AC 9: "New regression tests fail at HEAD and pass after the
 * fixes; they assert real side effects (Convex mutation args, cwd, mapped
 * shapes) rather than mocked returns."
 *
 * These tests replaced the deleted Phase 1 + Phase 3 Red test files
 * `pipelines.red.test.ts` (commit 9da9111) and `pipelines.phase3.red.test.ts`
 * (commit dbbe0e6), both deleted by commit a19a3a1. They assert real side
 * effects against the route implementations shipped in commits bd288ed,
 * 2767bf1, f4d4652:
 *
 *   - `POST /api/pipelines/:name/trigger` passes `execution.id` as the
 *     `executionId` field to `createPipelineRunHandler` (not `taskId`).
 *   - `POST /api/pipelines/:name/trigger` propagates persistence failures
 *     as HTTP 5xx (does not swallow).
 *   - `GET /api/pipelines` maps raw `pipelineRuns` rows to the
 *     `PipelineExecution[]` contract with executionId / pipelineName /
 *     status / startedAt / completedAt.
 *   - `GET /api/pipelines?limit=N` forwards the limit to
 *     `listPipelineRunsHandler`.
 *
 * These tests are NOT red at the post-fix HEAD (all production boundary
 * fixes are already shipped). They exist as regression guards against
 * future refactors of `pivot/src/routes/pipelines.ts` that would silently
 * break the boundary contract.
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Router } from './router.js';
import { registerPipelineRoutes } from './pipelines.js';

const FN_SYM = Symbol.for('functionName');
function fnName(ref: unknown): string {
  return (ref as Record<symbol, string>)?.[FN_SYM] ?? '';
}

const PIPELINES_PATH = join(process.cwd(), 'conductor', 'pipelines.yml');

function writePipelinesYaml(content: string): void {
  writeFileSync(PIPELINES_PATH, content, 'utf-8');
}

function makeMockClient(overrides: { query?: any; mutation?: any } = {}) {
  return {
    query: overrides.query ?? mock(async () => []),
    mutation: overrides.mutation ?? mock(async () => 'pipelineRuns:placeholder0000000000000000'),
  };
}

describe('Pipeline Routes — real-side-effect regression', () => {
  afterEach(() => {
    if (existsSync(PIPELINES_PATH)) {
      rmSync(PIPELINES_PATH);
    }
  });

  beforeEach(() => {
    // Ensure clean state between tests.
    if (existsSync(PIPELINES_PATH)) {
      rmSync(PIPELINES_PATH);
    }
  });

  describe('POST /api/pipelines/:name/trigger', () => {
    it('passes execution.id as executionId (string field), not taskId, to createPipelineRunHandler', async () => {
      writePipelinesYaml(`pipelines:
  - name: regression-trigger
    trigger: manual
    stages:
      - name: build
        steps:
          - name: compile
            command: echo ok
`);

      const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
      const client = {
        query: mock(async () => []),
        mutation: mock(async (fn: unknown, args: Record<string, unknown>) => {
          calls.push({ fn: fnName(fn), args });
          return 'pipelineRuns:k57abc00000000000000000000';
        }),
      };

      const router = new Router();
      registerPipelineRoutes(router, client as any);

      const response = await router
        .match('POST', '/api/pipelines/regression-trigger/trigger')!
        .handler(
          new Request('http://localhost/api/pipelines/regression-trigger/trigger', {
            method: 'POST',
          }),
          { name: 'regression-trigger' },
        );

      expect(response.status).toBe(200);
      const createCall = calls.find((c) => c.fn === 'pipelineRuns:createPipelineRunHandler');
      expect(createCall).toBeDefined();
      // Real side effect: executionId is a string (the runner UUID), not a
      // Convex v.id('tasks') value. taskId is omitted.
      expect(typeof createCall!.args.executionId).toBe('string');
      expect(createCall!.args.executionId).toMatch(/^[0-9a-f-]{36}$/i);
      expect(createCall!.args.taskId).toBeUndefined();
    });

    it('propagates persistence failures as HTTP 5xx (does not swallow)', async () => {
      writePipelinesYaml(`pipelines:
  - name: regression-failing
    trigger: manual
    stages:
      - name: build
        steps:
          - name: compile
            command: echo ok
`);

      const client = {
        query: mock(async () => []),
        mutation: mock(async () => {
          throw new Error('Convex validation failed');
        }),
      };

      const router = new Router();
      registerPipelineRoutes(router, client as any);

      const response = await router
        .match('POST', '/api/pipelines/regression-failing/trigger')!
        .handler(
          new Request('http://localhost/api/pipelines/regression-failing/trigger', {
            method: 'POST',
          }),
          { name: 'regression-failing' },
        );

      // Real side effect: persistence failure propagates as HTTP 5xx,
      // not a 200 with a swallowed error.
      expect(response.status).toBeGreaterThanOrEqual(500);
      expect(response.status).toBeLessThan(600);
    });
  });

  describe('GET /api/pipelines', () => {
    it('maps raw pipelineRuns rows to the PipelineExecution[] contract', async () => {
      const rows = [
        {
          _id: 'k57aa000000000000000000000',
          executionId: 'exec-1',
          taskId: 'tasks:k57ta00000000000000000000',
          stage: 'executor',
          status: 'completed',
          startTime: 1_700_000_000_000,
          endTime: 1_700_000_060_000,
          createdAt: 1_700_000_000_000,
        },
        {
          _id: 'k57bb000000000000000000000',
          executionId: 'exec-2',
          taskId: undefined,
          stage: 'executor',
          status: 'running',
          startTime: 1_700_000_120_000,
          endTime: undefined,
          createdAt: 1_700_000_120_000,
        },
      ];
      const client = makeMockClient({
        query: mock(async () => rows),
      });

      const router = new Router();
      registerPipelineRoutes(router, client as any);

      const response = await router
        .match('GET', '/api/pipelines')!
        .handler(new Request('http://localhost/api/pipelines'), {});

      expect(response.status).toBe(200);
      const data = await response.json();
      // Real side effect: the route maps raw rows to the spec'd
      // PipelineExecution[] contract (not raw rows).
      expect(data).toHaveLength(2);
      expect(data[0]).toEqual({
        executionId: 'exec-1',
        pipelineName: 'unknown',
        status: 'succeeded',
        startedAt: 1_700_000_000_000,
        completedAt: 1_700_000_060_000,
      });
      expect(data[1]).toEqual({
        executionId: 'exec-2',
        pipelineName: 'unknown',
        status: 'running',
        startedAt: 1_700_000_120_000,
        completedAt: undefined,
      });
    });

    it('forwards the limit query parameter to listPipelineRunsHandler', async () => {
      const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
      const client = {
        query: mock(async (fn: unknown, args: Record<string, unknown>) => {
          calls.push({ fn: fnName(fn), args });
          return [];
        }),
        mutation: mock(async () => 'placeholder'),
      };

      const router = new Router();
      registerPipelineRoutes(router, client as any);

      await router
        .match('GET', '/api/pipelines')!
        .handler(new Request('http://localhost/api/pipelines?limit=25'), {});

      const listCall = calls.find((c) => c.fn === 'pipelineRuns:listPipelineRunsHandler');
      expect(listCall).toBeDefined();
      // Real side effect: limit forwarded as a number.
      expect(listCall!.args.limit).toBe(25);
    });

    it('returns the real pipelineName from each seeded pipelineRuns row (FR-3/FR-5 — no more "unknown")', async () => {
      // Reproduces FR-3: `pivot/src/routes/pipelines.ts:204` hardcodes
      // `pipelineName: 'unknown'` for every row. AC5 of the production-
      // boundary spec requires the real name to be returned. The fix
      // threads `pipelineName` through `createPipelineRunHandler` and
      // maps it on the GET response.
      const rows = [
        {
          _id: 'k57fr3aa0000000000000000000',
          executionId: 'exec-fr3-1',
          pipelineName: 'fr3-pipeline-alpha',
          stage: 'executor',
          status: 'completed',
          startTime: 1_700_000_000_000,
          endTime: 1_700_000_060_000,
          createdAt: 1_700_000_000_000,
        },
        {
          _id: 'k57fr3bb0000000000000000000',
          executionId: 'exec-fr3-2',
          pipelineName: 'fr3-pipeline-beta',
          stage: 'executor',
          status: 'running',
          startTime: 1_700_000_120_000,
          endTime: undefined,
          createdAt: 1_700_000_120_000,
        },
      ];
      const client = makeMockClient({
        query: mock(async () => rows),
      });

      const router = new Router();
      registerPipelineRoutes(router, client as any);

      const response = await router
        .match('GET', '/api/pipelines')!
        .handler(new Request('http://localhost/api/pipelines'), {});

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(2);
      // Real side effect: each row carries its seeded pipelineName,
      // not the literal 'unknown' that HEAD hardcodes at
      // `pivot/src/routes/pipelines.ts:204`.
      expect(data[0].pipelineName).toBe('fr3-pipeline-alpha');
      expect(data[1].pipelineName).toBe('fr3-pipeline-beta');
      // Negative guard: none of the rows should be the 'unknown'
      // placeholder that HEAD locks in.
      for (const item of data) {
        expect(item.pipelineName).not.toBe('unknown');
      }
    });
  });
});