import { describe, expect, it, mock } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Router } from './router';
import { registerProjectRoutes, makeTrackId, extractGoalFromSpec, mergeStoriesSection } from './projects';
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

describe('helpers: makeTrackId / extractGoalFromSpec / mergeStoriesSection', () => {
  it('makeTrackId produces slug_<yyyymmdd>', () => {
    const id = makeTrackId('My Cool Sprint!', new Date('2026-06-10T12:00:00Z'));
    expect(id).toBe('my_cool_sprint_20260610');
  });

  it('makeTrackId falls back to "track" when title is empty', () => {
    const id = makeTrackId('!!!', new Date('2026-06-10T12:00:00Z'));
    expect(id).toBe('track_20260610');
  });

  it('extractGoalFromSpec reads the ## Goal section body', () => {
    const spec = ['# Title', '', '## Goal', '', 'Ship the thing.', '', '## Other'].join('\n');
    expect(extractGoalFromSpec(spec)).toBe('Ship the thing.');
  });

  it('extractGoalFromSpec falls back to the # Title when no goal section exists', () => {
    expect(extractGoalFromSpec('# Awesome Track\n\nNo goal here.')).toBe('Awesome Track');
  });

  it('mergeStoriesSection appends ## Stories when missing', () => {
    const result = mergeStoriesSection('# Title\n\n## Goal\n\nShip.\n', '## Stories\n\n### Story 1: x\n');
    expect(result).toContain('## Goal');
    expect(result).toContain('## Stories');
    expect(result).toContain('### Story 1: x');
  });

  it('mergeStoriesSection replaces an existing ## Stories section', () => {
    const original = ['# T', '', '## Stories', '', '### Story 1: old', '', '## After', ''].join('\n');
    const updated = mergeStoriesSection(original, '## Stories\n\n### Story 1: new\n');
    expect(updated).toContain('### Story 1: new');
    expect(updated).not.toContain('### Story 1: old');
    expect(updated).toContain('## After');
  });
});

describe('POST /api/projects/:id/tracks/:trackId/generate (preview)', () => {
  function makeClientWith({
    project,
    snapshot,
  }: {
    project: any;
    snapshot: any;
  }): ConvexHttpClient {
    return {
      query: mock(async (ref: any, args: any) => {
        if ('id' in args) return project;
        if ('trackId' in args && 'projectSlug' in args) return snapshot;
        return null;
      }),
      mutation: mock(async () => 'id'),
    } as unknown as ConvexHttpClient;
  }

  it('returns 503 when no story runner is configured', async () => {
    const router = new Router();
    const client = makeClientWith({
      project: { _id: 'p1', slug: 'demo', name: 'Demo' },
      snapshot: { specMarkdown: '# T\n## Goal\nShip.\n', planMarkdown: '', title: 'T', status: 'new', version: 1, trackId: 'tr1' },
    });
    registerProjectRoutes(router, client); // no runner

    const match = router.match('POST', '/api/projects/p1/tracks/tr1/generate')!;
    const res = await match.handler(
      makeRequest('POST', '/api/projects/p1/tracks/tr1/generate', {}),
      { id: 'p1', trackId: 'tr1' },
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe('HARNESS_UNAVAILABLE');
  });

  it('returns 404 when the project is missing', async () => {
    const router = new Router();
    const client = makeClientWith({ project: null, snapshot: null });
    registerProjectRoutes(router, client, async () => '[]');

    const match = router.match('POST', '/api/projects/missing/tracks/tr1/generate')!;
    const res = await match.handler(
      makeRequest('POST', '/api/projects/missing/tracks/tr1/generate', {}),
      { id: 'missing', trackId: 'tr1' },
    );
    expect(res.status).toBe(404);
  });

  it('returns 404 when the track snapshot is missing', async () => {
    const router = new Router();
    const client = makeClientWith({
      project: { _id: 'p1', slug: 'demo', name: 'Demo' },
      snapshot: null,
    });
    registerProjectRoutes(router, client, async () => '[]');

    const match = router.match('POST', '/api/projects/p1/tracks/missing/generate')!;
    const res = await match.handler(
      makeRequest('POST', '/api/projects/p1/tracks/missing/generate', {}),
      { id: 'p1', trackId: 'missing' },
    );
    expect(res.status).toBe(404);
  });

  it('returns 200 with parsed stories on a clean LLM response', async () => {
    const story = {
      title: 'Sign up',
      asA: 'new user',
      iWant: 'to register',
      soThat: 'I can use the app',
      acceptanceCriteria: ['Email required'],
      estimate: 'M',
      priority: 'Must',
    };
    const runner = mock(async () => JSON.stringify([story]));
    const router = new Router();
    const client = makeClientWith({
      project: { _id: 'p1', slug: 'demo', name: 'Demo' },
      snapshot: { specMarkdown: '# T\n\n## Goal\n\nShip.\n', planMarkdown: '', title: 'T', status: 'new', version: 1, trackId: 'tr1' },
    });
    registerProjectRoutes(router, client, runner as any);

    const match = router.match('POST', '/api/projects/p1/tracks/tr1/generate')!;
    const res = await match.handler(
      makeRequest('POST', '/api/projects/p1/tracks/tr1/generate', { goal: 'override goal' }),
      { id: 'p1', trackId: 'tr1' },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.projectSlug).toBe('demo');
    expect(body.trackId).toBe('tr1');
    expect(body.stories).toHaveLength(1);
    expect(body.stories[0].title).toBe('Sign up');
    expect(runner).toHaveBeenCalled();
    const prompt = (runner.mock.calls[0] as unknown[])[0] as string;
    expect(prompt).toContain('override goal');
  });

  it('returns 502 PARSE_ERROR when the LLM returns invalid JSON', async () => {
    const router = new Router();
    const client = makeClientWith({
      project: { _id: 'p1', slug: 'demo', name: 'Demo' },
      snapshot: { specMarkdown: '# T', planMarkdown: '', title: 'T', status: 'new', version: 1, trackId: 'tr1' },
    });
    registerProjectRoutes(router, client, async () => 'not json at all');

    const match = router.match('POST', '/api/projects/p1/tracks/tr1/generate')!;
    const res = await match.handler(
      makeRequest('POST', '/api/projects/p1/tracks/tr1/generate', {}),
      { id: 'p1', trackId: 'tr1' },
    );
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.code).toBe('PARSE_ERROR');
  });

  it('returns 502 HARNESS_ERROR when the runner throws', async () => {
    const router = new Router();
    const client = makeClientWith({
      project: { _id: 'p1', slug: 'demo', name: 'Demo' },
      snapshot: { specMarkdown: '# T', planMarkdown: '', title: 'T', status: 'new', version: 1, trackId: 'tr1' },
    });
    registerProjectRoutes(router, client, async () => {
      throw new Error('boom');
    });

    const match = router.match('POST', '/api/projects/p1/tracks/tr1/generate')!;
    const res = await match.handler(
      makeRequest('POST', '/api/projects/p1/tracks/tr1/generate', {}),
      { id: 'p1', trackId: 'tr1' },
    );
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.code).toBe('HARNESS_ERROR');
  });
});

describe('POST /api/projects/:id/tracks/:trackId/generate/commit', () => {
  const stories = [
    {
      title: 'Sign up',
      asA: 'new user',
      iWant: 'to register',
      soThat: 'I can use the app',
      acceptanceCriteria: ['Email required'],
      estimate: 'M',
      priority: 'Must',
    },
    {
      title: 'Log in',
      asA: 'returning user',
      iWant: 'to log in',
      soThat: 'I can resume',
      acceptanceCriteria: ['Password required'],
      estimate: 'S',
      priority: 'Should',
    },
  ];

  it('rejects empty story arrays with 400', async () => {
    const router = new Router();
    const client = {
      query: mock(async () => ({ _id: 'p1', slug: 'demo', name: 'Demo' })),
      mutation: mock(async () => 'id'),
    } as unknown as ConvexHttpClient;
    registerProjectRoutes(router, client);

    const match = router.match('POST', '/api/projects/p1/tracks/tr1/generate/commit')!;
    const res = await match.handler(
      makeRequest('POST', '/api/projects/p1/tracks/tr1/generate/commit', { stories: [] }),
      { id: 'p1', trackId: 'tr1' },
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when the track snapshot is missing', async () => {
    const router = new Router();
    const client = {
      query: mock(async (ref: any, args: any) => {
        if ('id' in args) return { _id: 'p1', slug: 'demo', name: 'Demo' };
        return null;
      }),
      mutation: mock(async () => 'id'),
    } as unknown as ConvexHttpClient;
    registerProjectRoutes(router, client);

    const match = router.match('POST', '/api/projects/p1/tracks/tr1/generate/commit')!;
    const res = await match.handler(
      makeRequest('POST', '/api/projects/p1/tracks/tr1/generate/commit', { stories }),
      { id: 'p1', trackId: 'tr1' },
    );
    expect(res.status).toBe(404);
  });

  it('upserts the spec with ## Stories + one task per story', async () => {
    const router = new Router();
    const mutation = mock(async () => 'id');
    const query = mock(async (ref: any, args: any) => {
      if ('id' in args) return { _id: 'p1', slug: 'demo', name: 'Demo' };
      if ('trackId' in args) {
        return {
          projectSlug: 'demo',
          trackId: 'tr1',
          title: 'Tr1',
          status: 'new',
          specMarkdown: '# Tr1\n\n## Goal\n\nShip.\n',
          planMarkdown: '# Plan',
          version: 2,
          updatedAt: 0,
        };
      }
      return null;
    });
    const client = { query, mutation } as unknown as ConvexHttpClient;
    registerProjectRoutes(router, client);

    const match = router.match('POST', '/api/projects/p1/tracks/tr1/generate/commit')!;
    const res = await match.handler(
      makeRequest('POST', '/api/projects/p1/tracks/tr1/generate/commit', { stories }),
      { id: 'p1', trackId: 'tr1' },
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.stories).toBe(2);
    expect(body.tasks).toBe(2);

    const args = mutation.mock.calls.map((c) => (c as unknown[])[1] as Record<string, unknown>);
    // upsertTrackSnapshot call carries the spec with ## Stories
    const trackUpsert = args.find((a) => 'specMarkdown' in a);
    expect(trackUpsert).toBeDefined();
    expect(String(trackUpsert!.specMarkdown)).toContain('## Stories');
    expect(String(trackUpsert!.specMarkdown)).toContain('Sign up');
    expect(trackUpsert!.expectedVersion).toBe(2);

    const taskArgs = args.filter((a) => 'taskKey' in a);
    expect(taskArgs).toHaveLength(2);
    expect(taskArgs[0].taskKey).toBe('tr1-story-1');
    expect(taskArgs[0].priority).toBe('high');
    expect(taskArgs[0].storyPoints).toBe(3);
    expect(taskArgs[1].priority).toBe('medium');
    expect(taskArgs[1].storyPoints).toBe(1);
  });
});
