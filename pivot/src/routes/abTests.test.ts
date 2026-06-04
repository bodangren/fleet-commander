import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { Router } from './router';
import { registerAbTestRoutes } from './abTests';
import type { ConvexHttpClient } from 'convex/browser';

/**
 * Create mock client
 * @returns {ConvexHttpClient} Mock Convex HTTP client for testing
 */
function createMockClient() {
  return {
    query: mock(),
    mutation: mock(),
  } as unknown as ConvexHttpClient;
}

describe('registerAbTestRoutes', () => {
  let router: Router;
  let client: ConvexHttpClient;

  beforeEach(() => {
    router = new Router();
    client = createMockClient();
    registerAbTestRoutes(router, client);
  });

  it('GET /api/ab-tests returns list', async () => {
    (client.query as any).mockResolvedValueOnce([]);
    const matched = router.match('GET', '/api/ab-tests');
    const response = await matched!.handler(new Request('http://localhost/api/ab-tests'), {});
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([]);
  });

  it('GET /api/ab-tests/:id returns 404 when not found', async () => {
    (client.query as any).mockResolvedValueOnce(null);
    const matched = router.match('GET', '/api/ab-tests/:id');
    const response = await matched!.handler(new Request('http://localhost/api/ab-tests/abc'), {
      id: 'abc',
    });
    expect(response.status).toBe(404);
  });

  it('POST /api/ab-tests returns 400 when name is missing', async () => {
    const matched = router.match('POST', '/api/ab-tests');
    const request = new Request('http://localhost/api/ab-tests', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const response = await matched!.handler(request, {});
    expect(response.status).toBe(400);
  });

  it('POST /api/ab-tests creates experiment', async () => {
    (client.mutation as any).mockResolvedValueOnce('new-id');
    const matched = router.match('POST', '/api/ab-tests');
    const request = new Request('http://localhost/api/ab-tests', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Test',
        agentRole: 'executor',
        controlModel: 'claude',
        treatmentModel: 'gpt-4o',
        splitRatio: 50,
      }),
    });
    const response = await matched!.handler(request, {});
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body._id).toBe('new-id');
  });

  it('PATCH /api/ab-tests/:id returns 400 when status is missing', async () => {
    const matched = router.match('PATCH', '/api/ab-tests/:id');
    const request = new Request('http://localhost/api/ab-tests/abc', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const response = await matched!.handler(request, { id: 'abc' });
    expect(response.status).toBe(400);
  });

  it('DELETE /api/ab-tests/:id deletes experiment', async () => {
    (client.mutation as any).mockResolvedValueOnce(null);
    const matched = router.match('DELETE', '/api/ab-tests/:id');
    const request = new Request('http://localhost/api/ab-tests/abc', { method: 'DELETE' });
    const response = await matched!.handler(request, { id: 'abc' });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
  });

  it('POST /api/ab-tests/:id/run returns 400 when taskDescription is missing', async () => {
    const matched = router.match('POST', '/api/ab-tests/:id/run');
    const request = new Request('http://localhost/api/ab-tests/abc/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const response = await matched!.handler(request, { id: 'abc' });
    expect(response.status).toBe(400);
  });

  it('POST /api/ab-tests/:id/run returns 404 when experiment not found', async () => {
    (client.query as any).mockResolvedValueOnce(null);
    const matched = router.match('POST', '/api/ab-tests/:id/run');
    const request = new Request('http://localhost/api/ab-tests/abc/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ taskDescription: 'Build a form' }),
    });
    const response = await matched!.handler(request, { id: 'abc' });
    expect(response.status).toBe(404);
  });

  it('POST /api/ab-tests/:id/run with AB_TEST_MOCK=false and mock=false returns 400 without persisting', async () => {
    const originalEnv = process.env.AB_TEST_MOCK;
    process.env.AB_TEST_MOCK = 'false';
    try {
      (client.query as any).mockResolvedValueOnce({
        _id: 'exp-1',
        name: 'Test',
        status: 'draft',
        controlModel: 'claude',
        treatmentModel: 'gpt-4o',
        agentRole: 'executor',
      });
      (client.mutation as any).mockResolvedValueOnce(undefined); // updateStatus only

      const matched = router.match('POST', '/api/ab-tests/:id/run');
      const request = new Request('http://localhost/api/ab-tests/exp-1/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ taskDescription: 'Build a login form', mock: false }),
      });
      const response = await matched!.handler(request, { id: 'exp-1' });
      expect(response.status).toBe(400);
      // Only updateStatus should have been called, not recordExperimentRun
      expect(client.mutation).toHaveBeenCalledTimes(1);
    } finally {
      if (originalEnv === undefined) {
        delete process.env.AB_TEST_MOCK;
      } else {
        process.env.AB_TEST_MOCK = originalEnv;
      }
    }
  });

  it('POST /api/ab-tests/:id/run executes benchmark and returns results', async () => {
    (client.query as any).mockResolvedValueOnce({
      _id: 'exp-1',
      name: 'Test',
      status: 'draft',
      controlModel: 'claude',
      treatmentModel: 'gpt-4o',
      agentRole: 'executor',
    });
    (client.mutation as any)
      .mockResolvedValueOnce(undefined) // updateStatus
      .mockResolvedValueOnce('run-1') // control run
      .mockResolvedValueOnce('run-2'); // treatment run

    const matched = router.match('POST', '/api/ab-tests/:id/run');
    const request = new Request('http://localhost/api/ab-tests/exp-1/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ taskDescription: 'Build a login form' }),
    });
    const response = await matched!.handler(request, { id: 'exp-1' });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.controlRunId).toBe('run-1');
    expect(body.treatmentRunId).toBe('run-2');
    expect(body.similarity).toBeDefined();
    expect(body.control.cost).toBeDefined();
    expect(body.treatment.durationMs).toBeDefined();
  });

  it('GET /api/ab-tests/:id/results returns results with summary', async () => {
    (client.query as any).mockResolvedValueOnce({
      experiment: { _id: 'exp-1', name: 'Test', status: 'running' },
      runs: [],
      summary: {
        controlAvgCost: 0,
        treatmentAvgCost: 0,
        controlAvgDuration: 0,
        treatmentAvgDuration: 0,
        controlRejectionRate: 0,
        treatmentRejectionRate: 0,
        avgSimilarity: 0,
        controlRuns: 0,
        treatmentRuns: 0,
      },
    });
    const matched = router.match('GET', '/api/ab-tests/:id/results');
    const response = await matched!.handler(
      new Request('http://localhost/api/ab-tests/exp-1/results'),
      { id: 'exp-1' },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.experiment).toBeDefined();
    expect(body.summary).toBeDefined();
  });
});
