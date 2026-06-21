/**
 * Phase 1 Red tests for pipeline route boundary bugs.
 *
 * These tests fail at HEAD because:
 *   1. The trigger route passes the runner-generated UUID as `taskId` to
 *      `createPipelineRunHandler`, which expects a valid `v.id('tasks')`.
 *   2. `GET /api/pipelines` returns raw `pipelineRuns` rows instead of the
 *      `PipelineExecution[]` contract the frontend consumes.
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

describe('Pipeline Routes — real boundary Red tests', () => {
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
    it('persists the execution under a string executionId field', async () => {
      writePipelinesYaml(`pipelines:
  - name: test-pipeline
    trigger: manual
    stages:
      - name: build
        steps:
          - name: compile
            command: echo ok
`);

      const router = new Router();
      registerPipelineRoutes(router, mockClient as any);

      const request = new Request('http://localhost/api/pipelines/test-pipeline/trigger', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ env: { TEST: '1' } }),
      });

      const response = await router.match('POST', '/api/pipelines/test-pipeline/trigger')!.handler(
        request,
        { name: 'test-pipeline' },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.executionId).toBeDefined();

      // Red: the route must call createPipelineRunHandler with the string
      // executionId. At HEAD it passes the UUID as `taskId`, which fails
      // Convex validation.
      const createCalls = (mockClient.mutation as any).mock.calls.filter(
        (call: any[]) => fnName(call[0]) === 'pipelineRuns:createPipelineRunHandler',
      );
      expect(createCalls.length).toBeGreaterThan(0);
      const createArgs = createCalls[0][1];
      expect(createArgs.executionId).toBe(body.executionId);
      expect(createArgs.taskId).toBeUndefined();
    });

    it('surfaces a 500/502 when Convex persistence fails instead of swallowing', async () => {
      writePipelinesYaml(`pipelines:
  - name: failing-persist-pipeline
    trigger: manual
    stages:
      - name: build
        steps:
          - name: compile
            command: echo ok
`);

      (mockClient.mutation as any).mockImplementation(async () => {
        throw new Error('Convex validation failed: taskId is not a valid Id');
      });

      const router = new Router();
      registerPipelineRoutes(router, mockClient as any);

      const request = new Request('http://localhost/api/pipelines/failing-persist-pipeline/trigger', {
        method: 'POST',
      });

      const response = await router.match('POST', '/api/pipelines/failing-persist-pipeline/trigger')!.handler(
        request,
        { name: 'failing-persist-pipeline' },
      );

      // Red: current code catches and swallows the mutation error, returning 200.
      // The fix must propagate persistence failures as HTTP errors.
      expect(response.status).toBeGreaterThanOrEqual(500);
      expect(response.status).toBeLessThan(600);
    });
  });

  describe('GET /api/pipelines', () => {
    it('maps raw pipelineRuns rows to the PipelineExecution contract', async () => {
      (mockClient.query as any).mockImplementation(async () => [
        {
          _id: 'k57ff...',
          executionId: 'exec-1',
          taskId: 'task-1',
          stage: 'executor',
          status: 'completed',
          startTime: 1_700_000_000_000,
          endTime: 1_700_000_060_000,
          createdAt: 1_700_000_000_000,
        },
        {
          _id: 'k57fg...',
          executionId: 'exec-2',
          taskId: 'task-2',
          stage: 'executor',
          status: 'running',
          startTime: 1_700_000_120_000,
          createdAt: 1_700_000_120_000,
        },
      ]);

      const router = new Router();
      registerPipelineRoutes(router, mockClient as any);

      const match = router.match('GET', '/api/pipelines');
      const response = await match!.handler(
        new Request('http://localhost/api/pipelines'),
        {},
      );
      expect(response.status).toBe(200);
      const data = await response.json();

      // Red: current code returns the raw rows unchanged.
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
  });
});
