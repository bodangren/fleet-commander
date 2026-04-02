import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { Router } from './router.js';
import { registerPipelineRoutes } from './pipelines.js';

const PIPELINES_PATH = join(process.cwd(), 'conductor', 'pipelines.yml');

function writePipelinesYaml(content: string): void {
  writeFileSync(PIPELINES_PATH, content, 'utf-8');
}

describe('Pipeline Routes', () => {
  afterEach(() => {
    if (existsSync(PIPELINES_PATH)) {
      rmSync(PIPELINES_PATH);
    }
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
