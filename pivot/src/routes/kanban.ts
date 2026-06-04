import type { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import type { Router } from './router';
import { json, notFound, badRequest } from './router';

/**
 * Registers kanban routes for sprint and task management.
 * @param router - Bun Router instance
 * @param client - ConvexHttpClient instance
 */
export function registerKanbanRoutes(
  router: Router,
  client: ConvexHttpClient,
): void {
  // GET /api/board/projects/:projectId/sprints
  router.get('/api/board/projects/:projectId/sprints', async (_req, params) => {
    try {
      const sprints = await client.query(
        api.kanban.getSprintsByProjectHandler,
        { projectId: params.projectId as any },
      );
      return json({ data: sprints });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: message }, 500);
    }
  });

  // GET /api/board/projects/:projectId/active-sprint
  router.get('/api/board/projects/:projectId/active-sprint', async (_req, params) => {
    try {
      const sprint = await client.query(
        api.kanban.getActiveSprintHandler,
        { projectId: params.projectId as any },
      );
      return json({ data: sprint });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: message }, 500);
    }
  });

  // GET /api/board/sprints/:sprintId
  router.get('/api/board/sprints/:sprintId', async (_req, params) => {
    try {
      const board = await client.query(
        api.kanban.getSprintBoardHandler,
        { sprintId: params.sprintId as any },
      );
      return json({ data: board });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: message }, 500);
    }
  });

  // PATCH /api/board/tasks/:taskId/status
  router.patch('/api/board/tasks/:taskId/status', async (req, params) => {
    try {
      const body = (await req.json()) as { status: string };
      if (!body.status) {
        return badRequest('status is required');
      }
      await client.mutation(
        api.tasks.updateTaskStatusHandler,
        { id: params.taskId as any, status: body.status as any },
      );
      return json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: message }, 500);
    }
  });

  // PATCH /api/board/sprints/:sprintId/status
  router.patch('/api/board/sprints/:sprintId/status', async (req, params) => {
    try {
      const body = (await req.json()) as { status: string };
      if (!body.status) {
        return badRequest('status is required');
      }
      await client.mutation(
        api.sprints.updateSprintStatusHandler,
        { id: params.sprintId as any, status: body.status as any },
      );
      return json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: message }, 500);
    }
  });

  // POST /api/board/sprints/:sprintId/close
  router.post('/api/board/sprints/:sprintId/close', async (_req, params) => {
    try {
      await client.mutation(
        api.sprints.closeSprintHandler,
        { id: params.sprintId as any },
      );
      return json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: message }, 500);
    }
  });

  // POST /api/board/tasks/:taskId/unblock
  router.post('/api/board/tasks/:taskId/unblock', async (_req, params) => {
    try {
      const result = await client.mutation(
        api.kanban.unblockTaskHandler,
        { taskId: params.taskId as any },
      );
      return json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: message }, 500);
    }
  });
}
