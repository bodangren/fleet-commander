import { ConvexHttpClient } from 'convex/browser';
import { Router, json, notFound, badRequest } from './router';

export function registerIssueRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/projects/:projectSlug/issues', async (_req, params) => {
    const issues = await client.query('issues:listIssuesByProject' as never, {
      projectSlug: params.projectSlug,
    } as never);
    return json(issues);
  });

  router.post('/api/projects/:projectSlug/issues', async (request, params) => {
    const body = (await request.json()) as Record<string, unknown>;
    await client.mutation('fleetCatalog:upsertIssue' as never, {
      projectSlug: params.projectSlug,
      issueId: body.issueId ?? `issue-${Date.now()}`,
      title: body.title ?? 'Untitled',
      body: body.body ?? '',
      status: body.status ?? 'open',
      assignedAgent: body.assignedAgent,
      trackId: body.trackId,
      sourcePath: body.sourcePath,
      openedAt: Date.now(),
    } as never);
    return json({ ok: true }, 201);
  });

  router.get('/api/projects/:projectSlug/issues/:issueId', async (_req, params) => {
    const issue = await client.query('issues:getIssueById' as never, {
      issueId: params.issueId,
    } as never);
    if (!issue) return notFound();
    return json(issue);
  });

  router.patch('/api/projects/:projectSlug/issues/:issueId', async (request, params) => {
    const body = (await request.json()) as Record<string, unknown>;
    await client.mutation('issues:updateIssue' as never, {
      issueId: params.issueId,
      title: body.title as string | undefined,
      body: body.body as string | undefined,
      status: body.status as string | undefined,
      assignedAgent: body.assignedAgent as string | undefined,
    } as never);
    return json({ ok: true });
  });

  router.delete('/api/projects/:projectSlug/issues/:issueId', async (_request, params) => {
    await client.mutation('issues:deleteIssue' as never, {
      issueId: params.issueId,
    } as never);
    return json({ ok: true });
  });
}
