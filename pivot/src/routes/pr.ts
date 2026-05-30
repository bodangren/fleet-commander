import { Router, json, badRequest, notFound } from './router';
import { ConvexHttpClient } from 'convex/browser';
import { createPRClient, generatePRDescription, type Provider } from '../pr/factory';
import type { PRDescriptionContext } from '../pr/types';

/**
 * Registers PR routes for creating pull requests and managing PR lifecycle.
 * @param router - Express Router instance
 * @param _client - ConvexHttpClient instance (unused)
 */
export function registerPRRoutes(router: Router, _client: ConvexHttpClient): void {
  const trackedPRs = new Map<number, { url: string; status: string; taskId: string; provider: Provider }>();

  router.post('/api/pr/create', async (request) => {
    const body = await request.json().catch(() => null);
    if (!body || !body.projectPath || !body.branch || !body.taskId || !body.taskTitle) {
      return badRequest('projectPath, branch, taskId, and taskTitle are required');
    }

    const provider: Provider = body.provider ?? 'github';
    const prClient = createPRClient(provider, body.projectPath);

    const context: PRDescriptionContext = {
      taskId: body.taskId,
      taskTitle: body.taskTitle,
      trackId: body.trackId,
      specSummary: body.specSummary,
      acceptanceCriteria: body.acceptanceCriteria,
      agentSummary: body.agentSummary,
      commitHash: body.commitHash,
    };

    const prDescription = generatePRDescription(context);

    try {
      const pr = await prClient.create({
        title: `${body.taskTitle} (task ${body.taskId})`,
        body: prDescription,
        branch: body.branch,
        baseBranch: body.baseBranch ?? 'main',
        draft: body.draft ?? true,
      });

      trackedPRs.set(pr.number, {
        url: pr.url,
        status: pr.status,
        taskId: body.taskId,
        provider,
      });

      return json({ pr }, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create PR';
      return json({ error: message }, 500);
    }
  });

  router.get('/api/prs', async () => {
    const prs = Array.from(trackedPRs.entries()).map(([number, info]) => ({
      number,
      ...info,
    }));
    return json({ prs });
  });

  router.get('/api/pr/:number/status', async (_request, params) => {
    const number = parseInt(params?.number as string, 10);
    if (isNaN(number)) {
      return badRequest('Invalid PR number');
    }
    const tracked = trackedPRs.get(number);
    if (!tracked) {
      return notFound('PR not tracked');
    }
    return json({ number, ...tracked });
  });
}
