import { describe, expect, it } from 'bun:test';
import { z } from 'zod';
import {
  Router,
  badRequest,
  json,
  methodNotAllowed,
  noContent,
  notFound,
  routeBody,
} from './router';

describe('Router', () => {
  it('matches static routes', () => {
    const router = new Router();
    router.get('/api/health', () => json({ status: 'ok' }));

    const result = router.match('GET', '/api/health');
    expect(result).not.toBeNull();
    expect(result!.params).toEqual({});
  });

  it('matches parameterized routes', () => {
    const router = new Router();
    router.get('/api/projects/:slug', (_req, params) => json(params));

    const result = router.match('GET', '/api/projects/my-project');
    expect(result).not.toBeNull();
    expect(result!.params).toEqual({ slug: 'my-project' });
  });

  it('matches routes with multiple params', () => {
    const router = new Router();
    router.patch('/api/projects/:slug/tasks/:taskKey', (_req, params) => json(params));

    const result = router.match('PATCH', '/api/projects/proj-1/tasks/task-42');
    expect(result).not.toBeNull();
    expect(result!.params).toEqual({ slug: 'proj-1', taskKey: 'task-42' });
  });

  it('returns null for unmatched routes', () => {
    const router = new Router();
    router.get('/api/health', () => json({ status: 'ok' }));

    expect(router.match('GET', '/api/missing')).toBeNull();
    expect(router.match('POST', '/api/health')).toBeNull();
  });

  it('distinguishes HTTP methods', () => {
    const router = new Router();
    router.get('/api/items', () => json('list'));
    router.post('/api/items', () => json('create'));

    expect(router.match('GET', '/api/items')).not.toBeNull();
    expect(router.match('POST', '/api/items')).not.toBeNull();
    expect(router.match('DELETE', '/api/items')).toBeNull();
  });

  it('handles URL-encoded params', () => {
    const router = new Router();
    router.get('/api/agents/:name', (_req, params) => json(params));

    const result = router.match('GET', '/api/agents/my%20agent');
    expect(result).not.toBeNull();
    expect(result!.params.name).toBe('my agent');
  });

  it('matches deeply nested parameterized routes', () => {
    const router = new Router();
    router.get('/api/projects/:projectSlug/issues/:issueId', (_req, params) => json(params));

    const result = router.match('GET', '/api/projects/proj/issues/issue-123');
    expect(result).not.toBeNull();
    expect(result!.params).toEqual({ projectSlug: 'proj', issueId: 'issue-123' });
  });
});

describe('Response helpers', () => {
  it('json returns proper content type', async () => {
    const res = json({ hello: 'world' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(await res.json()).toEqual({ hello: 'world' });
  });

  it('json accepts custom status', () => {
    const res = json({ created: true }, 201);
    expect(res.status).toBe(201);
  });

  it('json serializes null as the literal "null" body', async () => {
    const res = json(null);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(await res.json()).toBeNull();
  });

  it('notFound returns 404', async () => {
    const res = notFound();
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not_found' });
  });

  it('badRequest returns 400 with message', async () => {
    const res = badRequest('missing field');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('bad_request');
    expect(body.message).toBe('missing field');
  });

  it('notFound includes optional message in the body', async () => {
    const res = notFound('agent missing');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('not_found');
    expect(body.message).toBe('agent missing');
  });

  it('noContent returns 204 with no body and no content-type', async () => {
    const res = noContent();
    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
    expect(res.headers.get('content-type')).toBeNull();
  });

  it('methodNotAllowed returns 405 with the standard error shape', async () => {
    const res = methodNotAllowed();
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.error).toBe('method_not_allowed');
  });
});

describe('routeBody', () => {
  const schema = z.object({
    name: z.string().min(1),
    count: z.number().optional(),
  });

  function makeRequest(body: unknown): Request {
    return new Request('http://localhost/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('returns parsed data for valid body', async () => {
    const result = await routeBody(schema, makeRequest({ name: 'alice', count: 5 }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ name: 'alice', count: 5 });
    }
  });

  it('returns error for missing required field', async () => {
    const result = await routeBody(schema, makeRequest({ count: 5 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error).toBe('bad_request');
    }
  });

  it('error message includes the failing field path for missing required fields', async () => {
    const result = await routeBody(schema, makeRequest({ count: 5 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const body = await result.response.json();
      // Pins the contract that the 400 message is a diagnostic string that
      // includes the failing field name. A zod upgrade that changes the
      // issues-shape or the join character would surface here.
      expect(body.message).toContain('name');
    }
  });

  it('returns error for wrong type', async () => {
    const result = await routeBody(schema, makeRequest({ name: 123 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
    }
  });

  it('returns error for invalid JSON', async () => {
    const request = new Request('http://localhost/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    });
    const result = await routeBody(schema, request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.message).toContain('Invalid JSON');
    }
  });

  it('strips unknown fields with strict schema', async () => {
    const strictSchema = z.object({ name: z.string() }).strict();
    const result = await routeBody(strictSchema, makeRequest({ name: 'alice', extra: true }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
    }
  });

  it('accepts optional fields as undefined', async () => {
    const result = await routeBody(schema, makeRequest({ name: 'bob' }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.count).toBeUndefined();
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Phase 2 (package_dependency_upgrades_20260607) — Router edge-case
// characterization tests that pin the URL-matching contract the compatible
// `zod` and `convex` upgrades could affect. Per the track's test-strategy.md,
// these are characterization, not speculative: every assertion describes the
// current Router implementation. A regression introduced by a dependency
// change would surface as a failure here.
// ──────────────────────────────────────────────────────────────────────────────

describe('Phase 2: Router URL-matching characterization', () => {
  it('does not match a trailing-slash variant of a registered static route', () => {
    const router = new Router();
    router.get('/api/health', () => json({ status: 'ok' }));

    expect(router.match('GET', '/api/health/')).toBeNull();
  });

  it('does not match the same path registered with a trailing slash', () => {
    const router = new Router();
    router.get('/api/health/', () => json({ status: 'ok' }));

    expect(router.match('GET', '/api/health')).toBeNull();
  });

  it('matches routes in a case-sensitive manner', () => {
    const router = new Router();
    router.get('/api/health', () => json({ status: 'ok' }));

    expect(router.match('GET', '/api/health')).not.toBeNull();
    expect(router.match('GET', '/API/health')).toBeNull();
    expect(router.match('GET', '/api/Health')).toBeNull();
    expect(router.match('GET', '/API/HEALTH')).toBeNull();
  });

  it('does not collapse adjacent slashes in a request pathname', () => {
    const router = new Router();
    router.get('/api/health', () => json({ status: 'ok' }));

    expect(router.match('GET', '/api//health')).toBeNull();
  });

  it('strips query strings before matching a registered path', () => {
    const router = new Router();
    router.get('/api/health', () => json({ status: 'ok' }));

    // Query strings are stripped before matching so that routes registered
    // without query parameters still resolve correctly.
    expect(router.match('GET', '/api/health?probe=1')).not.toBeNull();
  });

  it('decodes percent-encoded parameter values into the params object', () => {
    const router = new Router();
    router.get('/api/agents/:name', (_req, params) => json(params));

    const result = router.match('GET', '/api/agents/my%20agent');
    expect(result).not.toBeNull();
    expect(result!.params.name).toBe('my agent');
  });

  it('returns a null match for an extra segment appended to a static route', () => {
    const router = new Router();
    router.get('/api/health', () => json({ status: 'ok' }));

    expect(router.match('GET', '/api/health/extra')).toBeNull();
  });

  it('matches a single-segment parameterized route against its exact segment count', () => {
    const router = new Router();
    router.get('/api/agents/:name', (_req, params) => json(params));

    expect(router.match('GET', '/api/agents')).toBeNull();
    expect(router.match('GET', '/api/agents/one/two')).toBeNull();
    expect(router.match('GET', '/api/agents/one')?.params).toEqual({ name: 'one' });
  });
});
