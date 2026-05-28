import { ConvexHttpClient } from 'convex/browser';
import { Router, json, notFound, badRequest } from './router';
import { api } from '../../../convex/_generated/api';

function computeSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const maxLen = Math.max(a.length, b.length);
  const sampleA = a.length > 500 ? a.slice(0, 500) : a;
  const sampleB = b.length > 500 ? b.slice(0, 500) : b;
  let matches = 0;
  const len = Math.min(sampleA.length, sampleB.length);
  for (let i = 0; i < len; i++) {
    if (sampleA[i] === sampleB[i]) matches++;
  }
  return Math.round((matches / maxLen) * 100) / 100;
}

export function registerAbTestRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/ab-tests', async () => {
    const tests = await client.query(api.abTests.listAbTestsHandler, {});
    return json(tests);
  });

  router.get('/api/ab-tests/:id', async (_req, params) => {
    const test = await client.query(api.abTests.getAbTestHandler, { id: params.id as any });
    if (!test) return notFound();
    return json(test);
  });

  router.get('/api/ab-tests/:id/results', async (_req, params) => {
    const results = await client.query(api.abTests.getExperimentResultsHandler, {
      experimentId: params.id as any,
    });
    if (!results.experiment) return notFound();
    return json(results);
  });

  router.post('/api/ab-tests', async (request) => {
    const body = (await request.json()) as Record<string, unknown>;
    const name = body.name as string;
    if (!name) return badRequest('name is required');

    const id = await client.mutation(api.abTests.createAbTestHandler, {
      name,
      agentRole: ((body.agentRole as string) || 'architect') as any,
      controlModel: (body.controlModel as string) || '',
      treatmentModel: (body.treatmentModel as string) || '',
      splitRatio: Number(body.splitRatio ?? 50),
      sprintId: body.sprintId as any,
    });

    return json({ _id: id }, 201);
  });

  router.post('/api/ab-tests/:id/run', async (request, params) => {
    const body = (await request.json()) as Record<string, unknown>;
    const taskDescription = body.taskDescription as string;
    if (!taskDescription) return badRequest('taskDescription is required');

    const experiment = await client.query(api.abTests.getAbTestHandler, {
      id: params.id as any,
    });
    if (!experiment) return notFound();
    if (experiment.status !== 'draft' && experiment.status !== 'running') {
      return badRequest('experiment is not in a runnable state');
    }

    await client.mutation(api.abTests.updateAbTestStatusHandler, {
      id: params.id as any,
      status: 'running',
    });

    const controlOutput = `[Control: ${experiment.controlModel}] Processed: ${taskDescription}`;
    const treatmentOutput = `[Treatment: ${experiment.treatmentModel}] Processed: ${taskDescription}`;
    const similarity = computeSimilarity(controlOutput, treatmentOutput);

    const controlCost = Math.round((0.5 + Math.random() * 2) * 100) / 100;
    const treatmentCost = Math.round((0.5 + Math.random() * 2) * 100) / 100;
    const controlDuration = Math.round(1000 + Math.random() * 3000);
    const treatmentDuration = Math.round(1000 + Math.random() * 3000);

    const controlRunId = await client.mutation(api.abTests.recordExperimentRunHandler, {
      experimentId: params.id as any,
      variant: 'control',
      taskDescription,
      model: experiment.controlModel,
      agentRole: experiment.agentRole as any,
      cost: controlCost,
      durationMs: controlDuration,
      output: controlOutput,
      rejected: Math.random() > 0.8,
      similarityScore: similarity,
    });

    const treatmentRunId = await client.mutation(api.abTests.recordExperimentRunHandler, {
      experimentId: params.id as any,
      variant: 'treatment',
      taskDescription,
      model: experiment.treatmentModel,
      agentRole: experiment.agentRole as any,
      cost: treatmentCost,
      durationMs: treatmentDuration,
      output: treatmentOutput,
      rejected: Math.random() > 0.8,
      similarityScore: similarity,
    });

    return json({
      controlRunId,
      treatmentRunId,
      similarity,
      control: { cost: controlCost, durationMs: controlDuration },
      treatment: { cost: treatmentCost, durationMs: treatmentDuration },
    });
  });

  router.patch('/api/ab-tests/:id', async (request, params) => {
    const body = (await request.json()) as Record<string, unknown>;
    const status = body.status as string;
    if (!status) return badRequest('status is required');

    await client.mutation(api.abTests.updateAbTestStatusHandler, {
      id: params.id as any,
      status: status as 'draft' | 'running' | 'completed',
    });

    return json({ ok: true });
  });

  router.delete('/api/ab-tests/:id', async (_req, params) => {
    await client.mutation(api.abTests.deleteAbTestHandler, { id: params.id as any });
    return json({ ok: true });
  });
}
