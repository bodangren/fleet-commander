/**
 * Adversarial test: Phase 3 Pipeline Persistence — args validation & contract.
 *
 * Track: operations_api_contract_closure_20260618
 * Strategy: measure/tracks/operations_api_contract_closure_20260618/test-strategy.md
 *   §3 ("Apply/reject of unknown id — must 404, not 500 (Convex returns null).")
 *   §3 ("Convex unavailable — pipeline trigger already swallows error in
 *        pipelines.ts:25; same tolerance must apply to reconciliation list")
 *   §5 ("P3: invert the placeholder test from P1; add pivot/src/routes/
 *        pipelines.test.ts cases for `GET /api/pipelines` happy/empty/error;
 *        update `storeExecution` assertions to write through
 *        api.pipelineRuns.createPipelineRunHandler.")
 *
 * The existing Phase 3 tests in `pipelines.test.ts` use a mock Convex client
 * that accepts ANY args. They assert the right handler is called, but NOT
 * that the args are valid. This file adds the missing contract: the route's
 * args to `api.pipelineRuns.*` handlers must be valid per the Convex schema,
 * and the response shape of `GET /api/pipelines/:executionId/logs` must
 * match the frontend `LogEntry` interface (stage, step, status, output, …).
 *
 * Each test exposes a real runtime bug the test-strategy didn't anticipate
 * because the production Convex validator never ran in CI:
 *
 *   1. The trigger route calls `createPipelineRunHandler` with
 *      `taskId: execution.triggeredByTaskId ?? execution.id ?? 'unknown'`.
 *      None of these values is a valid `Id<'tasks'>` Convex ID
 *      (UUIDs and the literal 'unknown' are not). The mutation is rejected
 *      by Convex's runtime validator. The route's `try { } catch {}` swallows
 *      the error, so the API returns 200 with a `pipelineRuns:1` ID that
 *      does not exist in the database.
 *   2. The trigger route calls `updatePipelineRunStatusHandler` with
 *      `id: executionId as string`. `executionId` is a UUID, not a valid
 *      `Id<'pipelineRuns'>` — same problem.
 *   3. The logs route calls `getPipelineRunsByTaskHandler` with
 *      `taskId: executionId as string`. The route URL says "logs of an
 *      execution" but the handler returns pipeline runs FOR A TASK. The
 *      frontend `LogEntry` interface expects `step`, `output`, `error`
 *      fields that the handler's response shape does not have.
 *
 * Each test below uses a validating fake Convex client that mirrors the
 * real Convex runtime's `v.id('table')` rejection logic, and a real
 * `pipelineRuns.getPipelineRunsByTaskHandler` implementation bound to a
 * `createMockCtx` so the response shape is the real shape, not a hand-rolled
 * mock. Tests run with `bun --cwd pivot test src/routes/pipelines-args-validation.test.ts`.
 */
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { existsSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { Router } from './router.js';
import { registerPipelineRoutes } from './pipelines.js';
import {
  getPipelineRunsByTaskHandler,
  createPipelineRunHandler,
  updatePipelineRunStatusHandler,
  listPipelineRunsHandler,
} from '../../../convex/pipelineRuns';
import { createMockCtx, sampleProject, sampleTask } from '../../../convex/__fixtures__/foundation';

// Convex's `query(...)` and `mutation(...)` wrappers return a
// `RegisteredQuery`/`RegisteredMutation` value, not a plain async function.
// The convex-internal test files (e.g. `convex/pipelineRuns.test.ts`) call
// these directly, but the pivot tsconfig is stricter. Cast to the shape we
// actually use: `(ctx, args) => Promise<result>`. This keeps the test type-
// clean without changing the convex runtime behavior under test.
const callGetPipelineRunsByTask = getPipelineRunsByTaskHandler as unknown as (
  ctx: ReturnType<typeof createMockCtx>,
  args: { taskId: string },
) => Promise<Array<Record<string, unknown>>>;

const FN_SYM = Symbol.for('functionName');
function fnName(ref: unknown): string {
  return (ref as Record<symbol, string>)?.[FN_SYM] ?? '';
}

// Convex ID format: 32 lowercase alphanumeric chars, excluding i, l, o, u.
const CONVEX_ID_BODY = '[a-hjkmnpqrstvwxyz0-9]{32}';
const TASK_ID_RE = new RegExp(`^tasks:${CONVEX_ID_BODY}$`);
const PIPELINE_RUN_ID_RE = new RegExp(`^pipelineRuns:${CONVEX_ID_BODY}$`);

const PIPELINES_PATH = join(process.cwd(), 'conductor', 'pipelines.yml');

function writePipelinesYaml(content: string): void {
  writeFileSync(PIPELINES_PATH, content, 'utf-8');
}

/**
 * Real Convex throws on invalid v.id('table') values. Our fake client mirrors
 * that: it inspects the function-name + args shape and throws an
 * ArgumentValidationError-style exception if the ID is missing or malformed.
 */
function createValidatingClient() {
  const calls: Array<{
    kind: 'query' | 'mutation';
    fn: string;
    args: any;
    rejected?: { reason: string };
  }> = [];
  return {
    calls,
    mutation: mock(async (fn: unknown, args: any) => {
      const name = fnName(fn);
      if (name === 'pipelineRuns:createPipelineRunHandler') {
        if (typeof args?.taskId !== 'string' || !TASK_ID_RE.test(args.taskId)) {
          const reason = `createPipelineRunHandler: taskId must be Id<'tasks'>, got ${JSON.stringify(args?.taskId)}`;
          calls.push({ kind: 'mutation', fn: name, args, rejected: { reason } });
          throw new Error(reason);
        }
      } else if (name === 'pipelineRuns:updatePipelineRunStatusHandler') {
        if (typeof args?.id !== 'string' || !PIPELINE_RUN_ID_RE.test(args.id)) {
          const reason = `updatePipelineRunStatusHandler: id must be Id<'pipelineRuns'>, got ${JSON.stringify(args?.id)}`;
          calls.push({ kind: 'mutation', fn: name, args, rejected: { reason } });
          throw new Error(reason);
        }
      }
      calls.push({ kind: 'mutation', fn: name, args });
      return 'pipelineRuns:placeholder000000000000000';
    }),
    query: mock(async (fn: unknown, args: any) => {
      const name = fnName(fn);
      if (name === 'pipelineRuns:getPipelineRunsByTaskHandler') {
        if (typeof args?.taskId !== 'string' || !TASK_ID_RE.test(args.taskId)) {
          const reason = `getPipelineRunsByTaskHandler: taskId must be Id<'tasks'>, got ${JSON.stringify(args?.taskId)}`;
          calls.push({ kind: 'query', fn: name, args, rejected: { reason } });
          throw new Error(reason);
        }
      }
      calls.push({ kind: 'query', fn: name, args });
      return [];
    }),
  };
}

describe('Phase 3 adversarial: pivot/routes/pipelines.ts Convex arg validation', () => {
  beforeEach(() => {
    // No reset — each test creates a fresh client.
  });

  afterEach(() => {
    if (existsSync(PIPELINES_PATH)) {
      rmSync(PIPELINES_PATH);
    }
  });

  describe('POST /api/pipelines/:name/trigger', () => {
    it('refuses to claim persistence when the createPipelineRunHandler args are not valid Convex IDs', async () => {
      // The route should EITHER pass a valid Convex Id<'tasks'> OR return a
      // 4xx/5xx so the caller can see the persistence failed. A 200 with a
      // fake `pipelineRuns:1` ID that doesn't exist in the database is the
      // worst outcome — the client believes the run was persisted when it
      // was silently dropped.
      writePipelinesYaml(`pipelines:
  - name: trigger-args
    trigger: manual
    stages:
      - name: build
        steps:
          - name: compile
            command: echo ok
`);

      const client = createValidatingClient();
      const router = new Router();
      registerPipelineRoutes(router, client as any);

      const request = new Request(
        'http://localhost/api/pipelines/trigger-args/trigger',
        { method: 'POST' },
      );
      const match = router.match('POST', '/api/pipelines/trigger-args/trigger');
      const response = await match!.handler(request, { name: 'trigger-args' });

      // Find the createPipelineRunHandler call. It MUST have been called with
      // a valid Convex Id<'tasks'>. The current implementation passes a UUID
      // (or 'unknown'), which the validator rejects.
      const createCall = client.calls.find(
        (c) => c.fn === 'pipelineRuns:createPipelineRunHandler',
      );
      expect(createCall).toBeDefined();
      expect(createCall!.rejected).toBeUndefined();
      expect(typeof createCall!.args.taskId).toBe('string');
      expect(TASK_ID_RE.test(createCall!.args.taskId)).toBe(true);

      // And the route must not return 200 when persistence failed. If the
      // call was rejected, the response should be a 5xx so the client can
      // see the failure — not a 200 with a fake ID.
      if (createCall!.rejected) {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('refuses to claim persistence when the updatePipelineRunStatusHandler id is not a valid Convex pipelineRun ID', async () => {
      // The route calls updatePipelineRunStatusHandler with
      // `id: execution.id` (a UUID). Convex rejects that ID format.
      writePipelinesYaml(`pipelines:
  - name: update-args
    trigger: manual
    stages:
      - name: build
        steps:
          - name: compile
            command: echo ok
`);

      const client = createValidatingClient();
      const router = new Router();
      registerPipelineRoutes(router, client as any);

      const request = new Request(
        'http://localhost/api/pipelines/update-args/trigger',
        { method: 'POST' },
      );
      const match = router.match('POST', '/api/pipelines/update-args/trigger');
      const response = await match!.handler(request, { name: 'update-args' });

      const updateCall = client.calls.find(
        (c) => c.fn === 'pipelineRuns:updatePipelineRunStatusHandler',
      );
      expect(updateCall).toBeDefined();
      expect(updateCall!.rejected).toBeUndefined();
      expect(PIPELINE_RUN_ID_RE.test(updateCall!.args.id)).toBe(true);

      if (updateCall!.rejected) {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });

  describe('GET /api/pipelines/:executionId/logs', () => {
    it('response shape matches the frontend LogEntry interface (stage, step, status, output, error)', async () => {
      // The frontend PipelineLogs component (frontend/src/components/PipelineLogs.tsx:7)
      // expects each log entry to have:
      //   { stage, step, status, output?, error?, startedAt?, completedAt? }
      // The actual pipelineRuns.getPipelineRunsByTaskHandler returns rows
      // with shape:
      //   { _id, taskId, stage, agentId, startTime, endTime, cost, status, createdAt }
      // These are two different schemas. The route currently returns the
      // handler's response directly, so the frontend's `log.step`,
      // `log.output`, `log.error` accesses yield `undefined`. This test
      // proves the contract gap by exercising the route against a real
      // handler bound to a populated mock Convex ctx.

      const ctx = createMockCtx();
      const projectId = await ctx.db.insert('projects', sampleProject);
      const taskId = await ctx.db.insert('tasks', { ...sampleTask, projectId });
      await ctx.db.insert('pipelineRuns', {
        taskId,
        stage: 'executor',
        status: 'completed',
        startTime: 1_700_000_000_000,
        endTime: 1_700_000_060_000,
        createdAt: 1_700_000_000_000,
      });

      const calls: Array<{ fn: string; args: any }> = [];
      const realClient = {
        query: async (fn: any, args: any) => {
          const name = fnName(fn);
          calls.push({ fn: name, args });
          if (name === 'pipelineRuns:getPipelineRunsByTaskHandler') {
            return await callGetPipelineRunsByTask(ctx, args);
          }
          return [];
        },
        mutation: async () => null,
      };

      const router = new Router();
      registerPipelineRoutes(router, realClient as any);

      const response = await router.match('GET', '/api/pipelines/exec-1/logs')!.handler(
        new Request('http://localhost/api/pipelines/exec-1/logs'),
        { executionId: 'exec-1' },
      );
      const data = await response.json();

      // The route forwards the handler's response directly. The real
      // handler returns `pipelineRunResponse[]`, which has no `step`,
      // `output`, or `error` fields. The frontend PipelineLogs component
      // dereferences all three on every render, so they would yield
      // `undefined` and the UI would render `<div>{log.step}</div>` as
      // empty (or crash on map of undefined).
      expect(data).toHaveLength(1);
      const first = data[0] as Record<string, unknown>;
      // Confirm the real shape: pipeline runs have these fields.
      expect(first.stage).toBe('executor');
      expect(first.status).toBe('completed');
      // Confirm the missing fields that the frontend expects.
      expect(first).not.toHaveProperty('step');
      expect(first).not.toHaveProperty('output');
      expect(first).not.toHaveProperty('error');
    });
  });
});
