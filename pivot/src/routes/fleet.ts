import { ConvexHttpClient } from 'convex/browser';
import { Router, json, badRequest } from './router';
import { api } from '../../../convex/_generated/api';

/**
 * Registers fleet routes including GET /api/fleet/status, GET /api/fleet/blockers, and GET /api/fleet/queue.
 * @param router - Express Router instance
 * @param client - ConvexHttpClient instance
 */
export function registerFleetRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/fleet/status', async () => {
    const status = await client.query(api.fleet.getFleetStatus, {});
    return json(status);
  });

  router.get('/api/fleet/blockers', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const projectSlug = url.searchParams.get('project') ?? undefined;
    const agent = url.searchParams.get('agent') ?? undefined;
    const [blockedTasks, openIssues] = await Promise.all([
      client.query(api.fleet.getBlockedTasksAcrossProjects, {
        projectSlug,
        assignee: agent,
      }),
      client.query(api.fleet.getOpenIssuesAcrossProjects, {
        projectSlug,
        assignedAgent: agent,
      }),
    ]);
    return json({ blockedTasks, openIssues });
  });

  router.get('/api/fleet/queue', async () => {
    const activeRuns = await client.query(api.fleet.getActiveRunsAcrossProjects, {});
    return json({ activeRuns });
  });

  router.get('/api/agents/workload', async () => {
    const workload = await client.query(api.fleet.getAgentWorkload, {});
    return json(workload);
  });

  router.get('/api/alerts', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const severity = url.searchParams.get('severity') ?? undefined;
    const type = url.searchParams.get('type') ?? undefined;
    const resolved = url.searchParams.get('resolved');
    const alerts = await client.query(api.fleet.getAlertsWithFilters, {
      severity: severity as 'critical' | 'warning' | 'info' | undefined,
      type,
      resolved: resolved !== null ? resolved === 'true' : undefined,
    });
    return json({ alerts });
  });

  router.patch('/api/alerts/:id/resolve', async (_req, params) => {
    const id = params.id;
    if (!id) return badRequest('Alert ID is required');
    await client.mutation(api.alerts.resolveAlert, { id: id as any });
    return json({ ok: true });
  });

  router.get('/api/projects/:slug/sprints/active', async (_req, params) => {
    const sprint = await client.query(api.fleet.getActiveSprintForProject, {
      projectSlug: params.slug,
    });
    if (!sprint) return json(null);
    return json(sprint);
  });

  router.get('/api/projects/:slug/sprints/:sprintId/tasks', async (_req, params) => {
    const sprint = await client.query(api.fleet.getActiveSprintForProject, {
      projectSlug: params.slug,
    });
    if (!sprint) return json([]);
    const tasks = await client.query(api.fleet.getTasksForSprint, {
      projectSlug: params.slug,
      taskKeys: sprint.taskKeys,
    });
    return json(tasks);
  });
}