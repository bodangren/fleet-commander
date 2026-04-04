import { ConvexHttpClient } from 'convex/browser';
import { Router, json, notFound, noContent } from './router';
import { api } from '../../../convex/_generated/api';

export function registerHarnessRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/harnesses', async () => {
    const harnesses = await client.query(api.fleetCatalog.listHarnesses, {});
    return json(harnesses);
  });

  router.get('/api/harnesses/:name', async (_req, params) => {
    const harness = await client.query(api.fleetCatalog.getHarnessByName, {
      name: params.name,
    });
    if (!harness) return notFound();
    return json(harness);
  });

  router.put('/api/harnesses/:name', async (request, params) => {
    const body = (await request.json()) as Record<string, unknown>;
    await client.mutation(api.fleetCatalog.upsertHarness, {
      name: params.name,
      commandTemplate: body.commandTemplate ?? '',
      discoveryCommand: body.discoveryCommand,
      source: body.source ?? 'manual',
    });
    return json({ ok: true });
  });

  router.delete('/api/harnesses/:name', async (_request, params) => {
    await client.mutation(api.fleetCatalog.deleteHarness, { name: params.name });
    return noContent();
  });

  router.post('/api/harnesses/:name/reset', async (_request, params) => {
    await client.mutation(api.fleetCatalog.deleteHarness, { name: params.name });
    return json({ ok: true, message: 'Harness reset to defaults' });
  });

  router.get('/api/harnesses/:name/models', async (_req, params) => {
    const harness = (await client.query(api.fleetCatalog.getHarnessByName, {
      name: params.name,
    })) as Record<string, unknown> | null;
    if (!harness) return notFound();

    const discoveryCmd = harness.discoveryCommand as string | undefined;
    if (!discoveryCmd) {
      return json({ models: [], message: 'No discovery command configured' });
    }

    try {
      const proc = Bun.spawn(discoveryCmd.split(' '), {
        stdout: 'pipe',
        timeout: 10000,
      });
      const output = await new Response(proc.stdout).text();
      const models = output
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      return json({ models });
    } catch {
      return json({ models: [], message: 'Discovery command failed' });
    }
  });
}
