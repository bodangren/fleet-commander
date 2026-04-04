import { ConvexHttpClient } from 'convex/browser';
import { Router, json, notFound, badRequest, noContent } from './router';
import { api } from '../../../convex/_generated/api';

export function registerProjectRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/health', () => json({ status: 'ok', message: 'Fleet Commander is running.' }));

  router.get('/api/projects', async () => {
    const projects = await client.query(api.projects.listProjects, {});
    return json(projects);
  });

  router.get('/api/projects/:slug', async (_req, params) => {
    const project = await client.query(api.projects.getProjectBySlug, {
      slug: params.slug,
    });
    if (!project) return notFound();
    return json(project);
  });

  router.post('/api/projects', async (request) => {
    const body = await request.json();
    const project = await client.mutation(api.projects.upsertProject, body);
    return json(project, 201);
  });

  router.post('/api/projects/scan', async () => {
    // Scan is a stub — returns empty list; full scanner deferred
    return json({ projects: [], message: 'Scanner deferred — use manual registration' });
  });

  router.post('/api/projects/scan-and-import', async () => {
    return json({ projects: [], message: 'Scanner deferred — use manual registration' });
  });

  router.post('/api/projects/:slug/run', async (_request, params) => {
    const runId = `run-${Date.now()}`;
    await client.mutation(api.fleetCatalog.upsertWorkRun, {
      projectSlug: params.slug,
      runId,
      status: 'running',
      startedAt: Date.now(),
    });
    return json({ runId, status: 'running' }, 202);
  });

  router.patch('/api/projects/:slug/tasks/:taskKey', async (request, params) => {
    const body = (await request.json()) as { status?: string };
    if (!body.status) return badRequest('status is required');
    await client.mutation(api.fleetCatalog.updateTaskStatus, {
      projectSlug: params.slug,
      taskKey: params.taskKey,
      status: body.status as 'blocked' | 'todo' | 'ready' | 'in_progress' | 'done',
    });
    return json({ ok: true });
  });

  router.get('/api/projects/:slug/next-task', async (_request, params) => {
    const tasks = await client.query(api.fleetCatalog.listTasksByProject, {
      projectSlug: params.slug,
    });
    const ready = (tasks as Array<{ status: string }>).find((t) => t.status === 'ready');
    return json(ready ?? null);
  });
}
