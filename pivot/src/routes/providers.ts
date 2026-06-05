import { ConvexHttpClient } from 'convex/browser';
import { Router, json } from './router';
import { api } from '../../../convex/_generated/api';
import { typedQuery } from '../convexClient';

/**
 * Register provider health and fallback routes.
 */
export function registerProviderRoutes(
  router: Router,
  client: ConvexHttpClient,
): void {
  /**
   * GET /api/providers/health — Returns all providers with health data.
   */
  router.get('/api/providers/health', async () => {
    const providers = await typedQuery(
      client,
      api.providers.getProviderHealth,
      {},
    );
    return json(providers);
  });

  /**
   * GET /api/providers/fallbacks — Returns recent fallback events.
   */
  router.get('/api/providers/fallbacks', async () => {
    const events = await typedQuery(
      client,
      api.providers.getFallbackHistory,
      { limit: 50 },
    );
    return json(events);
  });

  /**
   * GET /api/providers/:id/history — Returns health history for a specific provider.
   */
  router.get('/api/providers/:id/history', async (_request, params) => {
    const providerId = params.id;
    if (!providerId) {
      return json({ error: 'Missing provider ID' }, 400);
    }

    const history = await typedQuery(
      client,
      api.providers.getProviderHistory,
      { providerId: providerId as any, limit: 20 },
    );
    return json(history);
  });
}
