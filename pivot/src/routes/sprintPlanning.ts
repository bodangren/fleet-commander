import type { ConvexHttpClient } from 'convex/browser';
import { z } from 'zod';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { Router } from './router';
import { json, routeBody } from './router';
import { generateRecommendation } from '../planning/recommender';

const boundedSprintSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(1),
  budget: z.number().finite().nonnegative(),
  taskAssignments: z
    .array(z.object({ taskId: z.string().min(1), agentId: z.string().min(1) }))
    .length(1),
});

function convexErrorStatus(message: string): 400 | 500 {
  return message.includes('ArgumentValidationError') ? 400 : 500;
}

/**
 * Registers sprint planning routes for recommendations and backlog management.
 * @param router - Bun Router instance
 * @param client - ConvexHttpClient instance
 */
export function registerSprintPlanningRoutes(router: Router, client: ConvexHttpClient): void {
  // GET /api/planning/recommendation?projectId=xxx
  router.get('/api/planning/recommendation', async (request) => {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    if (!projectId) {
      return json({ error: 'projectId required' }, 400);
    }

    try {
      const tasks = await client.query(api.sprintPlanning.getBacklogTasksHandler, {
        projectId: projectId as Id<'projects'>,
      });

      const agents = await client.query(api.sprintPlanning.getAgentsForPlanningHandler, {});

      const recommendation = generateRecommendation(tasks, agents);

      return json(recommendation);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: message }, convexErrorStatus(message));
    }
  });

  // POST /api/planning/sprints
  router.post('/api/planning/sprints', async (request) => {
    const parsed = await routeBody(boundedSprintSchema, request);
    if (!parsed.ok) return parsed.response;

    try {
      const { projectId, name, budget, taskAssignments } = parsed.data;
      const assignment = taskAssignments[0];

      const result = await client.mutation(api.sprintPlanning.createSprintHandler, {
        projectId: projectId as Id<'projects'>,
        name,
        budget,
        taskId: assignment.taskId as Id<'tasks'>,
        agentId: assignment.agentId as Id<'agents'>,
      });

      return json({ ok: true, sprintId: result.sprintId, taskId: result.taskId });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: message }, convexErrorStatus(message));
    }
  });

  // GET /api/planning/projects/:projectId/stats
  router.get('/api/planning/projects/:projectId/stats', async (_req, params) => {
    try {
      const stats = await client.query(api.sprintPlanning.getProjectStatsHandler, {
        projectId: params.projectId as Id<'projects'>,
      });
      return json(stats);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: message }, 500);
    }
  });
}
