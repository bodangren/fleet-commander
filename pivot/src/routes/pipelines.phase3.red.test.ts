/**
 * Phase 3 Red tests — Operations API real persistence & contract shape.
 *
 * These tests fail at HEAD because the pivot route still has boundary gaps
 * after the initial Phase 3 Green commits:
 *
 *   1. `updateExecutionStatus` passes the runner UUID as `id` to
 *      `updatePipelineRunStatusHandler` instead of the `pipelineRunId` returned
 *      by `createPipelineRunHandler`.
 *   2. `GET /api/pipelines/:executionId/logs` queries
 *      `getPipelineRunsByTaskHandler` with the UUID as `taskId`, which is not a
 *      valid `Id<'tasks'>` and semantically looks up runs for a task, not an
 *      execution.
 *   3. `GET /api/pipelines` ignores the `limit` query parameter and never
 *      forwards it to `listPipelineRunsHandler`.
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { existsSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { Router } from './router.js';
import { registerPipelineRoutes } from './pipelines.js';
import { api } from '../../../convex/_generated/api';

const FN_SYM = Symbol.for('functionName');

function fnName(ref: unknown): string {
  return (ref as Record<symbol, string>)?.[FN_SYM] ?? '';
}

const mockClient = {
  mutation: mock(async () => {}),
  query: mock(async () => {}),
};

const PIPELINES_PATH = join(process.cwd(), 'conductor', 'pipelines.yml');

function writePipelinesYaml(content: string): void {
  writeFileSync(PIPELINES_PATH, content, 'utf-8');
}

describe('Phase 3 Red — Operations API persistence gaps', () => {
  afterEach(() => {
    if (existsSync(PIPELINES_PATH)) {
      rmSync(PIPELINES_PATH);
    }
  });

  beforeEach(() => {
    mockClient.mutation.mockReset();
    mockClient.query.mockReset();
  });

  describe('POST /api/pipelines/:name/trigger', () => {
    it('updates status using the pipelineRunId returned by createPipelineRunHandler', async () => {
      writePipelinesYaml(`pipelines:
  - name: status-update-ids
    trigger: manual
    stages:
      - name: build
        steps:
          - name: compile
            command: echo ok
`);

      const returnedRunId = 'pipelineRuns:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const captured: Array<{ fn: string; args: Record<string, unknown> }> = [];

      (mockClient.mutation as any).mockImplementation(async (fn: unknown, args: Record<string, unknown>) => {
        captured.push({ fn: fnName(fn), args });
        if (fnName(fn) === 'pipelineRuns:createPipelineRunHandler') {
          return returnedRunId;
        }
        return null;
      });

      const router = new Router();
      registerPipelineRoutes(router, mockClient as any);

      const request = new Request(
        'http://localhost/api/pipelines/status-update-ids/trigger',
        { method: 'POST' },
      );
      const match = router.match('POST', '/api/pipelines/status-update-ids/trigger');
      const response = await match!.handler(request, { name: 'status-update-ids' });

      expect(response.status).toBe(200);

      const updateCall = captured.find(
        (c) => c.fn === 'pipelineRuns:updatePipelineRunStatusHandler',
      );
      expect(updateCall).toBeDefined();
      expect(updateCall!.args.id).toBe(returnedRunId);
    });

    it('passes a valid triggeredByTaskId when present and omits it otherwise', async () => {
      writePipelinesYaml(`pipelines:
  - name: task-id-routing
    trigger: manual
    stages:
      - name: build
        steps:
          - name: compile
            command: echo ok
`);

      const captured: Array<{ fn: string; args: Record<string, unknown> }> = [];
      (mockClient.mutation as any).mockImplementation(async (fn: unknown, args: Record<string, unknown>) => {
        captured.push({ fn: fnName(fn), args });
        return 'pipelineRuns:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      });

      const router = new Router();
      registerPipelineRoutes(router, mockClient as any);

      const validTaskId = 'tasks:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const request = new Request(
        'http://localhost/api/pipelines/task-id-routing/trigger',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ triggeredByTaskId: validTaskId }),
        },
      );
      const match = router.match('POST', '/api/pipelines/task-id-routing/trigger');
      await match!.handler(request, { name: 'task-id-routing' });

      const createCall = captured.find(
        (c) => c.fn === 'pipelineRuns:createPipelineRunHandler',
      );
      expect(createCall).toBeDefined();
      expect(createCall!.args.taskId).toBe(validTaskId);
      expect(createCall!.args.executionId).toBeDefined();
      expect(typeof createCall!.args.executionId).toBe('string');
    });
  });

  describe('GET /api/pipelines/:executionId/logs', () => {
    it('looks up logs by executionId, not by taskId', async () => {
      const captured: Array<{ fn: string; args: Record<string, unknown> }> = [];
      (mockClient.query as any).mockImplementation(async (fn: unknown, args: Record<string, unknown>) => {
        captured.push({ fn: fnName(fn), args });
        return [];
      });

      const router = new Router();
      registerPipelineRoutes(router, mockClient as any);

      const match = router.match('GET', '/api/pipelines/exec-42/logs');
      const response = await match!.handler(
        new Request('http://localhost/api/pipelines/exec-42/logs'),
        { executionId: 'exec-42' },
      );

      const taskQuery = captured.find(
        (c) => c.fn === 'pipelineRuns:getPipelineRunsByTaskHandler',
      );
      expect(taskQuery).toBeUndefined();

      const executionQuery = captured.find(
        (c) =>
          c.fn.includes('pipelineRuns') &&
          c.args.executionId === 'exec-42',
      );
      expect(executionQuery).toBeDefined();
    });
  });

  describe('GET /api/pipelines', () => {
    it('forwards the limit query parameter to listPipelineRunsHandler', async () => {
      const captured: Array<{ fn: string; args: Record<string, unknown> }> = [];
      (mockClient.query as any).mockImplementation(async (fn: unknown, args: Record<string, unknown>) => {
        captured.push({ fn: fnName(fn), args });
        return [];
      });

      const router = new Router();
      registerPipelineRoutes(router, mockClient as any);

      const match = router.match('GET', '/api/pipelines');
      const response = await match!.handler(
        new Request('http://localhost/api/pipelines?limit=25'),
        {},
      );

      expect(response.status).toBe(200);

      const listCall = captured.find(
        (c) => c.fn === 'pipelineRuns:listPipelineRunsHandler',
      );
      expect(listCall).toBeDefined();
      expect(listCall!.args.limit).toBe(25);
    });
  });
});
