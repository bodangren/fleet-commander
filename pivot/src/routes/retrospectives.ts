import { ConvexHttpClient } from 'convex/browser';
import { Router, json, badRequest, notFound } from './router';
import { executeCommand } from '../orchestrator/executor';
import { constructRetrospectivePrompt, validateRetrospectiveReport } from '../shared/retrospectivePrompt';

const RETRO_AGENT_NAME = 'retrospective';
const RETRO_TIMEOUT_MS = 60000;

async function resolveRetrospectiveModel(client: ConvexHttpClient): Promise<string> {
  try {
    const agents = (await client.query('fleetCatalog:listAgents' as any, {})) as Array<
      Record<string, unknown>
    >;
    const agent = agents.find((a) => a.name === RETRO_AGENT_NAME);
    if (agent && typeof agent.model === 'string') {
      return agent.model;
    }
  } catch {
    // fall through
  }
  return 'openai/gpt-4o';
}

async function generateRetrospectiveReport(
  client: ConvexHttpClient,
  aggregatedData: unknown,
): Promise<{ report: string; error?: string }> {
  const model = await resolveRetrospectiveModel(client);
  const slashIdx = model.indexOf('/');
  const modelId = slashIdx === -1 ? model : model.slice(slashIdx + 1);

  const promptText = constructRetrospectivePrompt(aggregatedData);

  const result = await executeCommand(
    'opencode',
    ['run', '--model', modelId, promptText],
    RETRO_TIMEOUT_MS,
  );

  const combined = [result.stdout, result.stderr].filter(Boolean).join('\n');

  if (result.timedOut) {
    return { report: '', error: 'Retrospective generation timed out after 60s' };
  }
  if (result.exitCode !== 0) {
    return { report: '', error: `LLM execution failed (exit ${result.exitCode}): ${combined.slice(0, 500)}` };
  }

  return { report: combined };
}

export type GenerateReportFn = (
  client: ConvexHttpClient,
  aggregatedData: unknown,
) => Promise<{ report: string; error?: string }>;

export function registerRetrospectiveRoutes(
  router: Router,
  client: ConvexHttpClient,
  generateReport: GenerateReportFn = generateRetrospectiveReport,
): void {
  router.get('/api/retrospectives', async (req) => {
    const url = new URL(req.url, 'http://localhost');
    const projectSlug = url.searchParams.get('projectSlug') ?? undefined;
    const sprintId = url.searchParams.get('sprintId') ?? undefined;
    const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);

    const data = await client.query('retrospectives:listRetrospectives' as any, {
      projectSlug,
      sprintId,
      limit,
    });
    return json(data);
  });

  router.get('/api/retrospectives/:id', async (_req, params) => {
    const data = await client.query('retrospectives:getRetrospective' as any, {
      id: params.id,
    });
    if (!data) return notFound();
    return json(data);
  });

  router.post('/api/retrospectives/generate', async (req) => {
    const body = (await req.json()) as Record<string, unknown>;
    const sprintId = body.sprintId;
    if (!sprintId || typeof sprintId !== 'string') {
      return badRequest('Missing sprintId');
    }

    // 1. Fetch sprint data to name the retrospective
    const sprint = await client.query('sprints:getSprintById' as any, { id: sprintId });
    const sprintName = (sprint as any)?.name ?? 'Unknown Sprint';
    const projectSlug = (sprint as any)?.projectSlug ?? undefined;

    // 2. Create pending retrospective
    const retroId = (await client.mutation('retrospectives:createRetrospective' as any, {
      sprintId,
      projectSlug,
      name: `Retrospective: ${sprintName}`,
      triggeredBy: body.triggeredBy === 'scheduled' ? 'scheduled' : 'manual',
    })) as string;

    // 3. Aggregate sprint data
    let aggregatedData: unknown;
    try {
      aggregatedData = await client.query('retrospectives:getSprintAggregateData' as any, {
        sprintId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await client.mutation('retrospectives:failRetrospective' as any, {
        id: retroId,
        reportMarkdown: `Aggregation failed: ${message}`,
      });
      return json({ id: retroId, status: 'failed', error: message }, 500);
    }

    // 4. Generate report via LLM
    const { report, error } = await generateReport(client, aggregatedData);

    if (error || !report || report.trim().length === 0) {
      await client.mutation('retrospectives:failRetrospective' as any, {
        id: retroId,
        reportMarkdown: error ?? 'Empty report received from LLM',
      });
      return json({ id: retroId, status: 'failed', error: error ?? 'Empty report' }, 500);
    }

    // 5. Validate report structure
    const validation = validateRetrospectiveReport(report);
    if (!validation.valid) {
      const validationError = `Report missing required sections: ${validation.missing.join(', ')}`;
      await client.mutation('retrospectives:failRetrospective' as any, {
        id: retroId,
        reportMarkdown: `${report}\n\n---\n*Validation warning: ${validationError}*`,
      });
      return json({ id: retroId, status: 'failed', error: validationError }, 500);
    }

    // 6. Mark complete
    await client.mutation('retrospectives:completeRetrospective' as any, {
      id: retroId,
      reportMarkdown: report,
      aggregatedDataJson: JSON.stringify(aggregatedData),
    });

    const updated = await client.query('retrospectives:getRetrospective' as any, { id: retroId });
    return json(updated);
  });
}
