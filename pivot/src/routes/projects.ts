import { readdir, stat } from 'node:fs/promises';
import { ConvexHttpClient } from 'convex/browser';
import { Router, json, notFound, badRequest, noContent } from './router';
import { api } from '../../../convex/_generated/api';

export function registerProjectRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/health', () => json({ status: 'ok', message: 'Fleet Commander is running.' }));

  router.get('/api/projects', async () => {
    const projects = await client.query(api.projects.listProjectsHandler, {});
    return json(projects.map((p) => ({
      id: p._id,
      name: p.name,
      slug: p.slug,
      path: p.path,
      description: p.description,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })));
  });

  router.get('/api/projects/:id', async (_req, params) => {
    const project = await client.query(api.projects.getProjectHandler, {
      id: params.id as any,
    });
    if (!project) return notFound();
    return json({
      id: project._id,
      name: project.name,
      slug: project.slug,
      path: project.path,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
  });

  router.delete('/api/projects/:id', async (_req, params) => {
    await client.mutation(api.projects.deleteProjectHandler, {
      id: params.id as any,
    });
    return json({ ok: true });
  });

  router.post('/api/projects', async (request) => {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      path?: string;
    };

    if (!body.name) {
      return badRequest('name is required');
    }

    const id = await client.mutation(api.projects.createProjectHandler, {
      name: body.name,
      description: body.description ?? '',
      path: body.path,
    });

    return json({ _id: id, name: body.name, description: body.description ?? '', path: body.path }, 201);
  });

  router.post('/api/projects/scan', async (request) => {
    const body = (await request.json()) as { rootDir?: string };
    const rootDir = body.rootDir?.trim();
    if (!rootDir) return badRequest('rootDir is required');

    try {
      const entries = await readdir(rootDir, { withFileTypes: true });
      const paths: string[] = [];
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        try {
          const measureStat = await stat(`${rootDir}/${entry.name}/measure`);
          if (measureStat.isDirectory()) {
            paths.push(`${rootDir}/${entry.name}`);
          }
        } catch {
          // no measure/ directory — skip
        }
      }
      return json({ paths });
    } catch (err) {
      return json(
        { error: `Failed to scan: ${err instanceof Error ? err.message : 'Unknown'}` },
        500,
      );
    }
  });

  router.post('/api/projects/scan-and-import', async (request) => {
    const body = (await request.json()) as { rootDir?: string; paths?: string[] };
    const paths = body.paths && Array.isArray(body.paths) ? body.paths : [];

    if (paths.length === 0 && body.rootDir) {
      // Scan first, then import everything found
      try {
        const entries = await readdir(body.rootDir.trim(), { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
          try {
            const measureStat = await stat(`${body.rootDir.trim()}/${entry.name}/measure`);
            if (measureStat.isDirectory()) {
              paths.push(`${body.rootDir.trim()}/${entry.name}`);
            }
          } catch {
            // skip
          }
        }
      } catch (err) {
        return json(
          { error: `Failed to scan: ${err instanceof Error ? err.message : 'Unknown'}` },
          500,
        );
      }
    }

    if (paths.length === 0) {
      return json({ projects: [], message: 'No measure workspaces found.' });
    }

    const results = [];
    for (const path of paths) {
      const name = path.split('/').pop() || path;
      const id = await client.mutation(api.projects.createProjectHandler, {
        name,
        description: `Imported from ${path}`,
      });
      results.push({ _id: id, name, description: `Imported from ${path}` });
    }

    return json({ projects: results });
  });
}
