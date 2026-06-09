import { describe, expect, it, mock } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Router } from './router';
import { registerProjectRoutes } from './projects';
import { ConvexHttpClient } from 'convex/browser';

function makeRequest(method: string, path: string, body?: Record<string, unknown>): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Project route registration', () => {
  function createRouter(): Router {
    const router = new Router();
    const mockClient = {
      query: mock(async () => []),
      mutation: mock(async () => 'new-id'),
    } as unknown as ConvexHttpClient;
    registerProjectRoutes(router, mockClient);
    return router;
  }

  it('registers GET /api/health', () => {
    expect(createRouter().match('GET', '/api/health')).not.toBeNull();
  });

  it('registers GET /api/projects', () => {
    expect(createRouter().match('GET', '/api/projects')).not.toBeNull();
  });

  it('registers GET /api/projects/:id', () => {
    const result = createRouter().match('GET', '/api/projects/proj-1');
    expect(result).not.toBeNull();
    expect(result!.params).toEqual({ id: 'proj-1' });
  });

  it('registers DELETE /api/projects/:id', () => {
    expect(createRouter().match('DELETE', '/api/projects/proj-1')).not.toBeNull();
  });

  it('registers POST /api/projects', () => {
    expect(createRouter().match('POST', '/api/projects')).not.toBeNull();
  });

  it('registers POST /api/projects/scan', () => {
    expect(createRouter().match('POST', '/api/projects/scan')).not.toBeNull();
  });
});

describe('Project route handlers', () => {
  it('GET /api/health returns ok status', async () => {
    const router = new Router();
    registerProjectRoutes(router, { query: mock(async () => []), mutation: mock(async () => 'id') } as unknown as ConvexHttpClient);
    const match = router.match('GET', '/api/health')!;
    const res = await match.handler(makeRequest('GET', '/api/health'), {});
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('POST /api/projects returns 400 when name is missing', async () => {
    const router = new Router();
    registerProjectRoutes(router, { query: mock(async () => []), mutation: mock(async () => 'id') } as unknown as ConvexHttpClient);
    const match = router.match('POST', '/api/projects')!;
    const res = await match.handler(makeRequest('POST', '/api/projects', {}), {});
    expect(res.status).toBe(400);
  });

  it('POST /api/projects creates project with valid body', async () => {
    const router = new Router();
    registerProjectRoutes(router, { query: mock(async () => []), mutation: mock(async () => 'new-id') } as unknown as ConvexHttpClient);
    const match = router.match('POST', '/api/projects')!;
    const res = await match.handler(makeRequest('POST', '/api/projects', { name: 'my-project' }), {});
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('my-project');
  });

  it('GET /api/projects/:id returns 404 for missing project', async () => {
    const router = new Router();
    registerProjectRoutes(router, { query: mock(async () => null), mutation: mock(async () => 'id') } as unknown as ConvexHttpClient);
    const match = router.match('GET', '/api/projects/missing')!;
    const res = await match.handler(makeRequest('GET', '/api/projects/missing'), { id: 'missing' });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/projects/scan-and-import ingests tracks and tasks', () => {
  function makeWorkspace(): string {
    const root = mkdtempSync(join(tmpdir(), 'fc-route-import-'));
    const trackDir = join(root, 'measure', 'tracks', 'demo_track_20260101');
    mkdirSync(trackDir, { recursive: true });
    writeFileSync(join(trackDir, 'spec.md'), '# Demo Track\nStatus: active\n\n## Requirements\n- FR1');
    writeFileSync(join(trackDir, 'plan.md'), '- [ ] Task one\n- [x] Task two');
    return root;
  }

  it('upserts a track snapshot and tasks, returning counts', async () => {
    const workspace = makeWorkspace();
    try {
      const mutation = mock(async () => 'new-id');
      const client = {
        query: mock(async () => null), // project not found → route creates it
        mutation,
      } as unknown as ConvexHttpClient;
      const router = new Router();
      registerProjectRoutes(router, client);

      const match = router.match('POST', '/api/projects/scan-and-import')!;
      const res = await match.handler(
        makeRequest('POST', '/api/projects/scan-and-import', { paths: [workspace] }),
        {},
      );
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.projects).toHaveLength(1);
      expect(body.projects[0].tracks).toBe(1);
      expect(body.projects[0].tasks).toBe(2);

      const args = mutation.mock.calls.map(
        (c) => (c as unknown[])[1] as Record<string, unknown>,
      );
      expect(args.some((a) => 'specMarkdown' in a && a.trackId === 'demo_track_20260101')).toBe(true);
      const taskArgs = args.filter((a) => 'taskKey' in a);
      expect(taskArgs).toHaveLength(2);
      expect(taskArgs.map((a) => a.taskKey)).toContain('demo_track_20260101-task-1');
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});

describe('POST /api/projects/:id/tracks creates a new sprint/track', () => {
  it('returns 400 when title or goal is missing', async () => {
    const router = new Router();
    const client = {
      query: mock(async () => ({ _id: 'proj-1', name: 'demo', slug: 'demo' })),
      mutation: mock(async () => 'snap-1'),
    } as unknown as ConvexHttpClient;
    registerProjectRoutes(router, client);

    const match = router.match('POST', '/api/projects/proj-1/tracks')!;
    const res = await match.handler(
      makeRequest('POST', '/api/projects/proj-1/tracks', { title: '' }),
      { id: 'proj-1' },
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when project is not found', async () => {
    const router = new Router();
    const client = {
      query: mock(async () => null),
      mutation: mock(async () => 'snap-1'),
    } as unknown as ConvexHttpClient;
    registerProjectRoutes(router, client);

    const match = router.match('POST', '/api/projects/proj-missing/tracks')!;
    const res = await match.handler(
      makeRequest('POST', '/api/projects/proj-missing/tracks', {
        title: 'New Sprint',
        goal: 'Test goal',
      }),
      { id: 'proj-missing' },
    );
    expect(res.status).toBe(404);
  });

  it('creates a track and returns trackId + projectSlug', async () => {
    const router = new Router();
    const query = mock(async (_ref: any, args: any) => {
      // getProjectHandler returns the project
      if ('id' in args) {
        return { _id: args.id, name: 'demo', slug: 'demo' };
      }
      return null;
    });
    const mutation = mock(async (_ref: any, args: any) => {
      return {
        projectSlug: args.projectSlug,
        trackId: args.trackId,
        title: args.title,
        status: 'new',
        version: 1,
      };
    });
    const client = { query, mutation } as unknown as ConvexHttpClient;
    registerProjectRoutes(router, client);

    const match = router.match('POST', '/api/projects/proj-1/tracks')!;
    const res = await match.handler(
      makeRequest('POST', '/api/projects/proj-1/tracks', {
        title: 'My New Sprint',
        goal: 'Ship the feature so users are happy.',
      }),
      { id: 'proj-1' },
    );
    expect(res.status).toBe(201);
    const body = await res.json();

    expect(body.projectSlug).toBe('demo');
    expect(typeof body.trackId).toBe('string');
    expect(body.trackId.length).toBeGreaterThan(0);
    expect(body.title).toBe('My New Sprint');

    expect(mutation).toHaveBeenCalled();
    const callArgs = (mutation.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(callArgs.title).toBe('My New Sprint');
    expect(callArgs.goal).toBe('Ship the feature so users are happy.');
    expect(callArgs.projectSlug).toBe('demo');
  });
});
