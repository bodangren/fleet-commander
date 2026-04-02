import { ConvexHttpClient } from 'convex/browser';
import { Router, json } from './router';

export function registerSettingsRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/settings', async () => {
    const settings = await client.query('fleetCatalog:listSettingsByScope' as never, {
      scope: 'app',
    } as never);
    const config: Record<string, unknown> = {};
    for (const setting of settings as Array<{ key: string; valueJson: string }>) {
      try {
        config[setting.key] = JSON.parse(setting.valueJson);
      } catch {
        config[setting.key] = setting.valueJson;
      }
    }
    return json(config);
  });

  router.put('/api/settings', async (request) => {
    const body = (await request.json()) as Record<string, unknown>;
    for (const [key, value] of Object.entries(body)) {
      await client.mutation('fleetCatalog:setSetting' as never, {
        scope: 'app',
        key,
        valueJson: JSON.stringify(value),
      } as never);
    }
    return json({ ok: true });
  });
}
