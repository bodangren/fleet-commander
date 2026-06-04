import { z } from 'zod';
import { readdir, stat } from 'node:fs/promises';
import { ConvexHttpClient } from 'convex/browser';
import { Router, json, notFound, badRequest, noContent, routeBody } from './router';
import { api } from '../../../convex/_generated/api';

/**
 * Registers project routes for health check, listing projects, and CRUD operations.
 * @param router - Bun Router instance
 * @param client - ConvexHttpClient instance
 */
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
    const parsed = await routeBody(
      z.object({
        name: z.string().min(1, 'name is required'),
        description: z.string().optional(),
        path: z.string().optional(),
      }),
      request,
    );
    if (!parsed.ok) return parsed.response;
    const { name, description, path } = parsed.data;

    const id = await client.mutation(api.projects.createProjectHandler, {
      name,
      description: description ?? '',
      path,
    });

    return json({ _id: id, name, description: description ?? '', path }, 201);
  });

  router.post('/api/projects/scan', async (request) => {
    const parsed = await routeBody(
      z.object({ rootDir: z.string().min(1, 'rootDir is required') }),
      request,
    );
    if (!parsed.ok) return parsed.response;
    const rootDir = parsed.data.rootDir.trim();

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
    const parsed = await routeBody(
      z.object({
        rootDir: z.string().optional(),
        paths: z.array(z.string()).optional(),
      }),
      request,
    );
    if (!parsed.ok) return parsed.response;
    const { rootDir, paths: inputPaths } = parsed.data;
    const paths = inputPaths ? [...inputPaths] : [];

    if (paths.length === 0 && rootDir) {
      // Scan first, then import everything found
      try {
        const entries = await readdir(rootDir.trim(), { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
          try {
            const measureStat = await stat(`${rootDir.trim()}/${entry.name}/measure`);
            if (measureStat.isDirectory()) {
              paths.push(`${rootDir.trim()}/${entry.name}`);
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

  router.put('/api/projects/:id/routing-policy', async (request, params) => {
    const parsed = await routeBody(
      z.object({
        policy: z.enum(['quality_first', 'cost_first', 'balanced', 'manual']),
      }),
      request,
    );
    if (!parsed.ok) return parsed.response;

    await client.mutation(api.projects.updateProjectRoutingPolicy, {
      id: params.id as any,
      policy: parsed.data.policy,
    });

    return json({ ok: true });
  });
}
