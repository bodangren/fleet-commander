import { ConvexHttpClient } from 'convex/browser';
import { Router, json, badRequest, notFound } from './router';
import { getOpencodeClient } from '../orchestrator/opencodeServer';
import { sendPromptToSession, createSession } from '../orchestrator/sdkClient';
import { constructRetrospectivePrompt, validateRetrospectiveReport } from '../shared/retrospectivePrompt';

const RETRO_AGENT_NAME = 'retrospective';
const RETRO_TIMEOUT_MS = 60000;
const RETRO_MAX_TOKENS = 8000;

/**
 * Resolves the AI model to use for retrospective report generation.
 * @param client - ConvexHttpClient instance
 * @returns Model identifier string (e.g., "openai/gpt-4o")
 */
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

/**
 * Generate retrospective report using AI model based on aggregated sprint data.
 * @param client - ConvexHttpClient instance
 * @param aggregatedData - Aggregated sprint/execution data
 * @returns Report markdown string or error message
 */
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

  let sessionId: string;
  try {
    sessionId = await createSession(opencodeClient, 'retrospective-generation');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { report: '', error: `Failed to create session: ${message}` };
  }

  const result = await sendPromptToSession({
    client: opencodeClient,
    sessionId,
    promptText,
    providerId,
    modelId,
    timeoutMs: RETRO_TIMEOUT_MS,
    maxTokens: RETRO_MAX_TOKENS,
  });

  if (result.error) {
    return { report: '', error: `LLM execution failed: ${result.error.message}` };
  }

  return { report: result.output };
}

export type GenerateReportFn = (
  client: ConvexHttpClient,
  aggregatedData: unknown,
) => Promise<{ report: string; error?: string }>;

/**
 * Executes retrospective generation for a sprint, including data aggregation and AI report generation.
 * @param client - ConvexHttpClient instance
 * @param sprintId - Sprint identifier
 * @param triggeredBy - How the retrospective was triggered (manual or scheduled)
 * @param generateReport - Custom report generation function (for testing)
 * @returns Object containing id, status, and optional error
 */
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

/**
 * Registers retrospective routes for listing, getting, and generating retrospectives.
 * @param router - Bun Router instance
 * @param client - ConvexHttpClient instance
 * @param generateReport - Custom report generation function (for testing)
 */
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
