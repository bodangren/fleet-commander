import { ConvexHttpClient } from 'convex/browser';
import { Router, json, notFound } from './router';
import {
  loadPiHarnessCatalog,
  type PiHarnessCatalogEntry,
} from '../orchestrator/piReadiness';

export interface HarnessRouteDeps {
  catalog?: () => PiHarnessCatalogEntry[];
}

/**
 * Registers harness routes for listing, getting, creating, updating, and deleting harnesses.
 * @param router - Bun Router instance
 * @param client - ConvexHttpClient instance
 */
export function registerHarnessRoutes(
  router: Router,
  _client: ConvexHttpClient,
  deps: HarnessRouteDeps = {},
): void {
  router.get('/api/harnesses', async () => {
    return json((deps.catalog ?? loadPiHarnessCatalog)());
  });

  router.get('/api/harnesses/:name', async (_req, params) => {
    const harness = (deps.catalog ?? loadPiHarnessCatalog)().find(
      (entry) => entry.definition.name === params.name,
    ) ?? null;
    if (!harness) return notFound();
    return json(harness);
  });

  router.put('/api/harnesses/:name', async () => {
    return json(
      { error: 'Pi provider catalog is read-only; configure Pi outside Fleet Commander.' },
      405,
    );
  });

  router.delete('/api/harnesses/:name', async () => {
    return json(
      { error: 'Pi provider catalog is read-only; configure Pi outside Fleet Commander.' },
      405,
    );
  });

  router.post('/api/harnesses/:name/reset', async () => {
    return json(
      { error: 'Pi provider catalog is read-only; configure Pi outside Fleet Commander.' },
      405,
    );
  });

  router.get('/api/harnesses/:name/models', async (_req, params) => {
    const harness = (deps.catalog ?? loadPiHarnessCatalog)().find(
      (entry) => entry.definition.name === params.name,
    ) ?? null;
    if (!harness) return notFound();
    return json({ models: harness.models, readiness: harness.readiness });
  });
}
