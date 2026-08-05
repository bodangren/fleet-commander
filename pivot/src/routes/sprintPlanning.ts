import type { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import type { Router } from './router';
import { json, notFound } from './router';
import {
  generateRecommendation,
} from '../planning/recommender';
import type { Agent, Task } from '../planning/agentTypes';

/**
 * Registers sprint planning routes for recommendations and backlog management.
 * @param router - Bun Router instance
 * @param client - ConvexHttpClient instance
 */
export function registerSprintPlanningRoutes(
  router: Router,
  client: ConvexHttpClient,
): void {
  // GET /api/planning/recommendation?projectId=xxx
  router.get('/api/planning/recommendation', async (request) => {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    if (!projectId) {
      return json({ error: 'projectId required' }, 400);
    }

    try {
      const tasks = (await client.query(api.sprintPlanning.getBacklogTasksHandler, {
        projectId: projectId as any,
      })) as Task[];

      const agents = (await client.query(
        api.sprintPlanning.getAgentsForPlanningHandler,
        {},
      )) as Agent[];

      const recommendation = generateRecommendation(tasks, agents);

      return json(recommendation);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: message }, 500);
    }
  });

  // POST /api/planning/sprints
  router.post('/api/planning/sprints', async (request) => {
    try {
      const body = (await request.json()) as {
        projectId: string;
        name: string;
        budget: number;
        taskAssignments: Array<{ taskId: string; agentId: string }>;
      };

      if (!body.projectId || !body.name || body.budget == null) {
        return json({ error: 'projectId, name, and budget required' }, 400);
      }

      const sprintId = await client.mutation(
        api.sprintPlanning.createSprintHandler,
        {
          projectId: body.projectId as any,
          name: body.name,
          budget: body.budget,
        },
      );

      if (body.taskAssignments && body.taskAssignments.length > 0) {
        const taskIds = body.taskAssignments.map((a) => a.taskId);
        await client.mutation(
          api.sprintPlanning.assignTasksToSprintHandler,
          {
            sprintId: sprintId as any,
            taskIds: taskIds as any,
            agentAssignments: body.taskAssignments as any,
          },
        );
      }

      return json({ ok: true, sprintId });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: message }, 500);
    }
  });

  // GET /api/planning/projects/:projectId/stats
  router.get('/api/planning/projects/:projectId/stats', async (_req, params) => {
    try {
      const stats = await client.query(
        api.sprintPlanning.getProjectStatsHandler,
        { projectId: params.projectId as any },
      );
      return json(stats);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: message }, 500);
    }
  });
}
