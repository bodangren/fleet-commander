import { ConvexHttpClient } from 'convex/browser';
import { Router, json, notFound, noContent } from './router';
import { api } from '../../../convex/_generated/api';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

let cachedProviders: Record<string, string[]> | null = null;
let providerCacheTime = 0;
const PROVIDER_CACHE_MS = 30000;

async function discoverProviders(): Promise<Record<string, string[]>> {
  const now = Date.now();
  if (cachedProviders && now - providerCacheTime < PROVIDER_CACHE_MS) {
    return cachedProviders;
  }

  const configPaths = [
    join(homedir(), '.config', 'opencode', 'opencode.json'),
    join(homedir(), '.config', 'opencode', 'config.json'),
  ];

  const providers: Record<string, string[]> = {};

  for (const configPath of configPaths) {
    try {
      const content = await readFile(configPath, 'utf8');
      const config = JSON.parse(content);
      if (config.provider) {
        for (const [providerName, providerConfig] of Object.entries(config.provider)) {
          const models = Object.keys((providerConfig as any).models || {});
          if (models.length > 0) {
            providers[providerName] = models;
          }
        }
      }
    } catch {
      // Config file doesn't exist or is invalid, skip
    }
  }

  cachedProviders = providers;
  providerCacheTime = now;
  return providers;
}

function wrapHarness(harness: Record<string, unknown> | null) {
  if (!harness) return null;
  return {
    layer: (harness.source as string) || 'import',
    binaryFound: true,
    definition: {
      name: harness.name,
      binary: String(harness.commandTemplate ?? '').split(' ')[0] || String(harness.name ?? ''),
      discovery: {
        command: harness.discoveryCommand || '',
        parseStrategy: 'line-per-model',
        pattern: '',
      },
      invocation: {
        template: harness.commandTemplate || '',
        flags: {},
      },
    },
  };
}

export function registerHarnessRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/harnesses', async () => {
    const harnesses = await client.query(api.fleetCatalog.listHarnesses, {});
    return json(harnesses.map(wrapHarness));
  });

  router.get('/api/harnesses/:name', async (_req, params) => {
    const harness = await client.query(api.fleetCatalog.getHarnessByName, {
      name: params.name,
    });
    if (!harness) return notFound();
    return json(wrapHarness(harness));
  });

  router.put('/api/harnesses/:name', async (request, params) => {
    const body = (await request.json()) as Record<string, unknown>;
    await client.mutation(api.fleetCatalog.upsertHarness, {
      name: params.name,
      commandTemplate: (body.commandTemplate as string) ?? '',
      discoveryCommand: body.discoveryCommand as string | undefined,
      source: (body.source as 'manual' | 'scanner' | 'import') ?? 'manual',
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
    const providers = await discoverProviders();
    const models = providers[params.name];
    if (models) {
      return json({ models });
    }

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
