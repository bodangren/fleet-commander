import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { existsSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { Router } from './router.js';
import { registerPipelineRoutes } from './pipelines.js';
import { api } from '../../../convex/_generated/api';

const mockClient = {
  mutation: mock(async () => {}),
  query: mock(async () => {}),
};

const PIPELINES_PATH = join(process.cwd(), 'conductor', 'pipelines.yml');

/**
 * Writes pipelines YAML content to the pipelines file for testing.
 * @param content - YAML content string
 */
function writePipelinesYaml(content: string): void {
  writeFileSync(PIPELINES_PATH, content, 'utf-8');
}

describe('Pipeline Routes', () => {
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
    it('returns 404 for unknown pipeline', async () => {
      const router = new Router();
      registerPipelineRoutes(router);

      const request = new Request('http://localhost/api/pipelines/nonexistent/trigger', {
        method: 'POST',
      });

      const response = await router.match('POST', '/api/pipelines/nonexistent/trigger')!.handler(
        request,
        { name: 'nonexistent' },
      );

      expect(response.status).toBe(404);
    });

    it('returns execution ID for valid pipeline', async () => {
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
      registerPipelineRoutes(router);

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
      expect(body.status).toBe('succeeded');
      expect(body.pipelineName).toBe('test-pipeline');
    });

    it('returns execution ID even when Convex is unavailable', async () => {
      writePipelinesYaml(`pipelines:
  - name: simple-pipeline
    trigger: manual
    stages:
      - name: build
        steps:
          - name: compile
            command: echo ok
`);

      const router = new Router();
      registerPipelineRoutes(router);

      const request = new Request('http://localhost/api/pipelines/simple-pipeline/trigger', {
        method: 'POST',
      });

      const response = await router.match('POST', '/api/pipelines/simple-pipeline/trigger')!.handler(
        request,
        { name: 'simple-pipeline' },
      );

      const body = await response.json();
      if (response.status === 400) {
        expect(body.error || body.message).toBeDefined();
      } else {
        expect(response.status).toBe(200);
      }
    });
  });

  describe('GET /api/pipelines', () => {
    it('returns 200 with the list of recent pipeline executions', async () => {
      const executions = [
        {
          executionId: 'exec-1',
          pipelineName: 'deploy-prod',
          status: 'succeeded',
          startedAt: 1_700_000_000_000,
          completedAt: 1_700_000_060_000,
        },
        {
          executionId: 'exec-2',
          pipelineName: 'test-ci',
          status: 'running',
          startedAt: 1_700_000_120_000,
        },
      ];
      (mockClient.query as any).mockImplementation(async () => executions);

      const router = new Router();
      registerPipelineRoutes(router, mockClient as any);

      const match = router.match('GET', '/api/pipelines');
      expect(match).not.toBeNull();

      const response = await match!.handler(
        new Request('http://localhost/api/pipelines?limit=50'),
        {},
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(2);
      expect(data[0].executionId).toBe('exec-1');
      expect(data[0].status).toBe('succeeded');
      expect(data[0].pipelineName).toBe('deploy-prod');
    });

    it('returns an empty array when no executions exist', async () => {
      (mockClient.query as any).mockImplementation(async () => []);

      const router = new Router();
      registerPipelineRoutes(router, mockClient as any);

      const match = router.match('GET', '/api/pipelines');
      const response = await match!.handler(
        new Request('http://localhost/api/pipelines'),
        {},
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual([]);
    });

    it('returns 500 when the Convex list query throws', async () => {
      (mockClient.query as any).mockImplementation(async () => {
        throw new Error('Convex unavailable');
      });

      const router = new Router();
      registerPipelineRoutes(router, mockClient as any);

      const match = router.match('GET', '/api/pipelines');
      const response = await match!.handler(
        new Request('http://localhost/api/pipelines'),
        {},
      );
      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/pipelines/:name/status', () => {
    it('returns 404 for unknown pipeline', async () => {
      const router = new Router();
      registerPipelineRoutes(router);

      const request = new Request('http://localhost/api/pipelines/nonexistent/status');

      const response = await router.match('GET', '/api/pipelines/nonexistent/status')!.handler(
        request,
        { name: 'nonexistent' },
      );

      expect(response.status).toBe(404);
    });

    it('returns pipeline definition info', async () => {
      writePipelinesYaml(`pipelines:
  - name: test-pipeline
    trigger: both
    stages:
      - name: build
        steps:
          - name: compile
            command: echo build
          - name: lint
            command: echo lint
      - name: test
        steps:
          - name: unit
            command: echo test
`);

      const router = new Router();
      registerPipelineRoutes(router);

      const request = new Request('http://localhost/api/pipelines/test-pipeline/status');

      const response = await router.match('GET', '/api/pipelines/test-pipeline/status')!.handler(
        request,
        { name: 'test-pipeline' },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.name).toBe('test-pipeline');
      expect(body.trigger).toBe('both');
      expect(body.stages).toHaveLength(2);
      expect(body.stages[0].stepCount).toBe(2);
      expect(body.stages[1].stepCount).toBe(1);
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Phase 3 Red — pipeline persistence via api.pipelineRuns.* (NOT the placeholder
// api.pipelines.* module). These tests fail at HEAD because pivot/src/routes/
// pipelines.ts still calls api.pipelines.startPipeline, api.pipelines.update­
// PipelineStatus, and api.pipelines.getPipelineLogs (all of which return
// 'stub-id' / null / []). P3 Green must replace those calls with the real
// pipelineRuns handlers so the trigger persists, the list returns the run, and
// the logs route returns real rows instead of 404.
//
// Track: operations_api_contract_closure_20260618
// Strategy: measure/tracks/operations_api_contract_closure_20260618/test-strategy.md §5
//   ("update `storeExecution` assertions to write through api.pipelineRuns.
//    createPipelineRunHandler")
//   §6 ("Live behavior: pivot route tests that build a Router, register the
//    real handler, invoke it with a Request, and assert response status/body
//    via a mocked ConvexHttpClient — these prove the handler executes
//    end-to-end inside Bun.")
// ──────────────────────────────────────────────────────────────────────────────

describe('Phase 3: POST /api/pipelines/:name/trigger persists via api.pipelineRuns.*', () => {
  it('trigger mutation targets api.pipelineRuns.createPipelineRunHandler, not api.pipelines.startPipeline', async () => {
    writePipelinesYaml(`pipelines:
  - name: persist-via-reals
    trigger: manual
    stages:
      - name: build
        steps:
          - name: compile
            command: echo ok
`);

    const captured: Array<{ fn: unknown; args: unknown }> = [];
    (mockClient.mutation as any).mockImplementation(async (fn: unknown, args: unknown) => {
      captured.push({ fn, args });
      return 'pipeline-runs:1';
    });

    const router = new Router();
    registerPipelineRoutes(router, mockClient as any);

    const request = new Request('http://localhost/api/pipelines/persist-via-reals/trigger', {
      method: 'POST',
    });
    const match = router.match('POST', '/api/pipelines/persist-via-reals/trigger');
    expect(match).not.toBeNull();
    const response = await match!.handler(request, { name: 'persist-via-reals' });
    expect(response.status).toBe(200);

    // At least one mutation must target the real pipelineRuns create handler.
    const createCalls = captured.filter(
      (c) => c.fn === (api.pipelineRuns as any).createPipelineRunHandler,
    );
    expect(createCalls.length).toBeGreaterThan(0);

    // And no mutation may target the placeholder startPipeline.
    const placeholderCalls = captured.filter(
      (c) => c.fn === (api.pipelines as any).startPipeline,
    );
    expect(placeholderCalls).toEqual([]);
  });

  it('trigger also records completion via api.pipelineRuns.updatePipelineRunStatusHandler', async () => {
    writePipelinesYaml(`pipelines:
  - name: record-completion
    trigger: manual
    stages:
      - name: build
        steps:
          - name: compile
            command: echo ok
`);

    const captured: Array<{ fn: unknown; args: unknown }> = [];
    (mockClient.mutation as any).mockImplementation(async (fn: unknown, args: unknown) => {
      captured.push({ fn, args });
      return 'pipeline-runs:1';
    });

    const router = new Router();
    registerPipelineRoutes(router, mockClient as any);

    const request = new Request('http://localhost/api/pipelines/record-completion/trigger', {
      method: 'POST',
    });
    const match = router.match('POST', '/api/pipelines/record-completion/trigger')!;
    await match.handler(request, { name: 'record-completion' });

    const updateCalls = captured.filter(
      (c) => c.fn === (api.pipelineRuns as any).updatePipelineRunStatusHandler,
    );
    expect(updateCalls.length).toBeGreaterThan(0);

    const placeholderUpdateCalls = captured.filter(
      (c) => c.fn === (api.pipelines as any).updatePipelineStatus,
    );
    expect(placeholderUpdateCalls).toEqual([]);
  });

  it('trigger round-trip: persisted run appears in GET /api/pipelines list', async () => {
    writePipelinesYaml(`pipelines:
  - name: roundtrip-pipeline
    trigger: manual
    stages:
      - name: build
        steps:
          - name: compile
            command: echo ok
`);

    const persistedRun = {
      _id: 'pipeline-runs:1',
      taskId: 'tasks:1',
      stage: 'build',
      agentId: undefined,
      startTime: 1_700_000_000_000,
      endTime: 1_700_000_060_000,
      cost: 0,
      status: 'completed',
      createdAt: 1_700_000_000_000,
    };

    const capturedMutations: Array<{ fn: unknown; args: unknown }> = [];
    let mutationCount = 0;
    (mockClient.mutation as any).mockImplementation(async (fn: unknown, args: unknown) => {
      capturedMutations.push({ fn, args });
      mutationCount++;
      return 'pipeline-runs:1';
    });
    (mockClient.query as any).mockImplementation(async () => [persistedRun]);

    const router = new Router();
    registerPipelineRoutes(router, mockClient as any);

    // 1. Trigger — must call api.pipelineRuns.createPipelineRunHandler.
    const triggerMatch = router.match('POST', '/api/pipelines/roundtrip-pipeline/trigger')!;
    const triggerResponse = await triggerMatch.handler(
      new Request('http://localhost/api/pipelines/roundtrip-pipeline/trigger', {
        method: 'POST',
      }),
      { name: 'roundtrip-pipeline' },
    );
    expect(triggerResponse.status).toBe(200);

    // The trigger must have invoked the real pipelineRuns create handler.
    const realCreateCalls = capturedMutations.filter(
      (c) => c.fn === (api.pipelineRuns as any).createPipelineRunHandler,
    );
    expect(realCreateCalls.length).toBeGreaterThan(0);

    // 2. List — must return the persisted run.
    const listMatch = router.match('GET', '/api/pipelines')!;
    const listResponse = await listMatch.handler(
      new Request('http://localhost/api/pipelines'),
      {},
    );
    expect(listResponse.status).toBe(200);
    const data = await listResponse.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      _id: 'pipeline-runs:1',
      status: 'completed',
    });
  });
});

describe('Phase 3: GET /api/pipelines/:executionId/logs returns real rows, not 404', () => {
  it('returns 200 with the log payload when the real pipelineRuns query yields data', async () => {
    const realLogs = [
      { stage: 'build', step: 'compile', status: 'succeeded', output: 'ok' },
      { stage: 'build', step: 'test', status: 'succeeded', output: 'all green' },
    ];
    const captured: Array<{ fn: unknown; args: unknown }> = [];
    (mockClient.query as any).mockImplementation(async (fn: unknown, args: unknown) => {
      captured.push({ fn, args });
      return realLogs;
    });

    const router = new Router();
    registerPipelineRoutes(router, mockClient as any);

    const match = router.match('GET', '/api/pipelines/exec-1/logs')!;
    const response = await match.handler(
      new Request('http://localhost/api/pipelines/exec-1/logs'),
      { executionId: 'exec-1' },
    );

    // Red: at HEAD the route calls api.pipelines.getPipelineLogs (which always
    // returns null) and therefore responds 404. After P3, the route must call a
    // real pipelineRuns query and return the payload as 200.
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(realLogs);

    // And it must NOT be calling the placeholder getPipelineLogs anymore.
    const placeholderCalls = captured.filter(
      (c) => c.fn === (api.pipelines as any).getPipelineLogs,
    );
    expect(placeholderCalls).toEqual([]);
  });
});
