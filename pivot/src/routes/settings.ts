import { ConvexHttpClient } from 'convex/browser';
import { Router, json } from './router';
import { api } from '../../../convex/_generated/api';

const DEFAULT_CONFIG = {
  general: {
    defaultAgent: 'executor',
    orchestratorInterval: 30,
    logRetentionDays: 90,
  },
  providers: {
    cacheTTL: 30,
  },
  websocket: {
    reconnectInterval: 5000,
  },
};

export function registerSettingsRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/settings', async () => {
    const settings = await client.query(api.fleetCatalog.listSettingsByScope, {
      scope: 'app',
    });

    const stored: Record<string, unknown> = {};
    for (const setting of settings as Array<{ key: string; valueJson: string }>) {
      try {
        stored[setting.key] = JSON.parse(setting.valueJson);
      } catch {
        stored[setting.key] = setting.valueJson;
      }
    }

    const config = {
      general: {
        defaultAgent: (stored.defaultAgent as string) ?? DEFAULT_CONFIG.general.defaultAgent,
        orchestratorInterval: (stored.orchestratorInterval as number) ?? DEFAULT_CONFIG.general.orchestratorInterval,
        logRetentionDays: (stored.logRetentionDays as number) ?? DEFAULT_CONFIG.general.logRetentionDays,
      },
      providers: {
        cacheTTL: (stored.providerCacheTTL as number) ?? DEFAULT_CONFIG.providers.cacheTTL,
      },
      websocket: {
        reconnectInterval: (stored.reconnectInterval as number) ?? DEFAULT_CONFIG.websocket.reconnectInterval,
      },
    };

    return json(config);
  });

  router.put('/api/settings', async (request) => {
    const body = (await request.json()) as {
      general?: Record<string, unknown>;
      providers?: Record<string, unknown>;
      websocket?: Record<string, unknown>;
    };

    const sections = [
      { prefix: '', data: body.general },
      { prefix: 'provider', data: body.providers },
      { prefix: '', data: body.websocket },
    ];

    for (const { prefix, data } of sections) {
      if (!data) continue;
      for (const [key, value] of Object.entries(data)) {
        const settingKey = prefix ? `${prefix}${key.charAt(0).toUpperCase()}${key.slice(1)}` : key;
        await client.mutation(api.fleetCatalog.setSetting, {
          scope: 'app',
          key: settingKey,
          valueJson: JSON.stringify(value),
        });
      }
    }

    return json({ ok: true });
  });
}