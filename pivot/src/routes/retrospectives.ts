import { ConvexHttpClient } from 'convex/browser';
import { Router, json, badRequest, notFound } from './router';
import { getOpencodeClient } from '../orchestrator/opencodeServer';
import { constructRetrospectivePrompt, validateRetrospectiveReport } from '../shared/retrospectivePrompt';

const RETRO_AGENT_NAME = 'retrospective';
const RETRO_TIMEOUT_MS = 60000;
const RETRO_MAX_TOKENS = 8000;

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
  const providerId = slashIdx === -1 ? 'openai' : model.slice(0, slashIdx);
  const modelId = slashIdx === -1 ? model : model.slice(slashIdx + 1);

  const promptText = constructRetrospectivePrompt(aggregatedData);

  const opencodeClient = getOpencodeClient();
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), RETRO_TIMEOUT_MS);

  try {
    const createRes = await opencodeClient.session.create({
      body: { title: 'retrospective-generation' },
    });
    const session = createRes.data as { id: string } | undefined;
    if (!session?.id) {
      return { report: '', error: 'Failed to create OpenCode session' };
    }

    const response = await opencodeClient.session.prompt({
      path: { id: session.id },
      body: {
        model: { providerID: providerId, modelID: modelId },
        parts: [{ type: 'text', text: promptText }],
      },
    });

    clearTimeout(timeoutId);

    const data = response.data as
      | {
          info: {
            error?: { name: string; data?: { message?: string } };
          };
          parts: Array<{ type: string; text?: string }>;
        }
      | undefined;

    if (!data) {
      return { report: '', error: 'Empty response from OpenCode SDK' };
    }

    if (data.info.error) {
      return {
        report: '',
        error: `LLM execution failed: ${data.info.error.data?.message ?? data.info.error.name}`,
      };
    }

    const report = data.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('\n');

    return { report };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (abortController.signal.aborted) {
      return { report: '', error: 'Retrospective generation timed out after 60s' };
    }

    const message = err instanceof Error ? err.message : String(err);
    return { report: '', error: `LLM execution failed: ${message}` };
  }
}

export type GenerateReportFn = (
  client: ConvexHttpClient,
  aggregatedData: unknown,
) => Promise<{ report: string; error?: string }>;

export async function executeRetrospectiveGeneration(
  client: ConvexHttpClient,
  sprintId: string,
  triggeredBy: 'manual' | 'scheduled',
  generateReport: GenerateReportFn = generateRetrospectiveReport,
): Promise<{ id: string; status: string; error?: string }> {
  const sprint = await client.query('sprints:getSprintById' as any, { id: sprintId });
  const sprintName = (sprint as any)?.name ?? 'Unknown Sprint';
  const projectSlug = (sprint as any)?.projectSlug ?? undefined;

  const retroId = (await client.mutation('retrospectives:createRetrospective' as any, {
    sprintId,
    projectSlug,
    name: `Retrospective: ${sprintName}`,
    triggeredBy,
  })) as string;

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
    return { id: retroId, status: 'failed', error: message };
  }

  const { report, error } = await generateReport(client, aggregatedData);

  if (error || !report || report.trim().length === 0) {
    await client.mutation('retrospectives:failRetrospective' as any, {
      id: retroId,
      reportMarkdown: error ?? 'Empty report received from LLM',
    });
    return { id: retroId, status: 'failed', error: error ?? 'Empty report' };
  }

  const validation = validateRetrospectiveReport(report);
  if (!validation.valid) {
    const validationError = `Report missing required sections: ${validation.missing.join(', ')}`;
    await client.mutation('retrospectives:failRetrospective' as any, {
      id: retroId,
      reportMarkdown: `${report}\n\n---\n*Validation warning: ${validationError}*`,
    });
    return { id: retroId, status: 'failed', error: validationError };
  }

  await client.mutation('retrospectives:completeRetrospective' as any, {
    id: retroId,
    reportMarkdown: report,
    aggregatedDataJson: JSON.stringify(aggregatedData),
  });

  return { id: retroId, status: 'completed' };
}

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

    const result = await executeRetrospectiveGeneration(
      client,
      sprintId,
      body.triggeredBy === 'scheduled' ? 'scheduled' : 'manual',
      generateReport,
    );

    if (result.status === 'failed') {
      return json({ id: result.id, status: result.status, error: result.error }, 500);
    }

    const updated = await client.query('retrospectives:getRetrospective' as any, { id: result.id });
    return json(updated);
  });
}
