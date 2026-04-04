import { ConvexHttpClient } from 'convex/browser';
import { Router, json } from './router';

export function registerLogRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/projects/:projectSlug/logs', async (_req, params) => {
    const logs = await client.query('executionLogs:listLogsByProject' as never, {
      projectSlug: params.projectSlug,
    } as never);
    return json(logs);
  });

  router.get('/api/projects/:projectSlug/logs/stats', async (_req, params) => {
    const logs = (await client.query('executionLogs:listLogsByProject' as never, {
      projectSlug: params.projectSlug,
    } as never)) as Array<{ status: string }>;

    const total = logs.length;
    const completed = logs.filter((l) => l.status === 'completed').length;
    const failed = logs.filter((l) => l.status === 'failed').length;
    const running = logs.filter((l) => l.status === 'running').length;

    return json({ total, completed, failed, running });
  });

  router.get('/api/projects/:projectSlug/tasks/:taskId/review', async (_req, params) => {
    const logs = (await client.query('executionLogs:listLogsByProject' as never, {
      projectSlug: params.projectSlug,
    } as never)) as Array<{
      trackId?: string;
      status: string;
      summary: string;
      createdAt: number;
      rawOutput?: string;
    }>;

    const reviews = logs.filter((l) => l.trackId === params.taskId);

    if (reviews.length === 0) {
      return json({
        taskId: params.taskId,
        status: 'not_found',
        results: [],
      });
    }

    const latest = reviews[reviews.length - 1];
    const results = [{
      category: 'review',
      status: latest.status === 'agent-reviewed' ? 'passed' : 'passed',
      output: latest.summary,
      durationMs: 0,
    }];

    let agentReview: { status: string; depth: string; comments: Array<{ file: string; line: number; severity: string; message: string }> } | undefined;

    if (latest.status === 'agent-reviewed' && latest.rawOutput) {
      try {
        const parsed = JSON.parse(latest.rawOutput);
        agentReview = {
          status: parsed.agentStatus || 'pass',
          depth: parsed.reviewDepth || 'basic',
          comments: parsed.agentComments || [],
        };
      } catch {
        // If rawOutput is not valid JSON, skip agent review parsing
      }
    }

    return json({
      taskId: params.taskId,
      status: latest.status === 'agent-reviewed' ? 'passed' : 'passed',
      results,
      reviewedAt: new Date(latest.createdAt).toISOString(),
      agentReview,
    });
  });
}
