import { ConvexHttpClient } from 'convex/browser';
import { Router, json, notFound, badRequest } from './router';
import { api } from '../../../convex/_generated/api';

export function registerIssueRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/projects/:projectSlug/issues', async (_req, params) => {
    const issues = await client.query(api.issues.listIssuesByProject, {
      projectSlug: params.projectSlug,
    });
    return json(issues);
  });

  router.post('/api/projects/:projectSlug/issues', async (request, params) => {
    const body = (await request.json()) as Record<string, unknown>;
    await client.mutation(api.fleetCatalog.upsertIssue, {
      projectSlug: params.projectSlug,
      issueId: body.issueId ?? `issue-${Date.now()}`,
      title: body.title ?? 'Untitled',
      body: body.body ?? '',
      status: body.status ?? 'open',
      assignedAgent: body.assignedAgent,
      trackId: body.trackId,
      sourcePath: body.sourcePath,
      openedAt: Date.now(),
    });
    return json({ ok: true }, 201);
  });

  router.get('/api/projects/:projectSlug/issues/:issueId', async (_req, params) => {
    const issue = await client.query(api.issues.getIssueById, {
      issueId: params.issueId,
    });
    if (!issue) return notFound();
    return json(issue);
  });

  router.patch('/api/projects/:projectSlug/issues/:issueId', async (request, params) => {
    const body = (await request.json()) as Record<string, unknown>;
    await client.mutation(api.issues.updateIssue, {
      issueId: params.issueId,
      title: body.title as string | undefined,
      body: body.body as string | undefined,
      status: body.status as string | undefined,
      assignedAgent: body.assignedAgent as string | undefined,
    });
    return json({ ok: true });
  });

  router.delete('/api/projects/:projectSlug/issues/:issueId', async (_request, params) => {
    await client.mutation(api.issues.deleteIssue, {
      issueId: params.issueId,
    });
    return json({ ok: true });
  });
}
