/**
 * Registered-runtime contracts for provider CRUD, health monitoring, and
 * fallback history.
 *
 * The former provider suites called Convex handlers with hand-written mock
 * contexts. These tests use the shared convex-test backend instead, so the
 * real schema, indexes, validators, generated API, and authenticated identity
 * are exercised together.
 */

import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { createConvexTest } from '../test/convexTest';

type ConvexTest = ReturnType<typeof createConvexTest>;
type ProviderStatus = 'active' | 'rate_limited' | 'idle';
type ProviderHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

type ProviderOverrides = Partial<{
  name: string;
  models: string[];
  status: ProviderStatus;
  healthStatus: ProviderHealthStatus;
  latency: number;
  baseUrl: string;
  defaultModels: string[];
  lastCheckedAt: number;
  failureCount: number;
  avgLatencyMs: number;
  lastSuccessAt: number;
  createdAt: number;
}>;

async function createProvider(
  t: ConvexTest,
  overrides: Partial<{
    name: string;
    models: string[];
    latency: number;
    baseUrl: string;
    defaultModels: string[];
  }> = {},
): Promise<Id<'providers'>> {
  return t.mutation(api.providers.createProviderHandler, {
    name: overrides.name ?? 'openai',
    models: overrides.models ?? ['gpt-4o'],
    ...(overrides.latency !== undefined ? { latency: overrides.latency } : {}),
    ...(overrides.baseUrl !== undefined ? { baseUrl: overrides.baseUrl } : {}),
    ...(overrides.defaultModels !== undefined
      ? { defaultModels: overrides.defaultModels }
      : {}),
  });
}

async function seedProvider(
  t: ConvexTest,
  overrides: ProviderOverrides = {},
): Promise<Id<'providers'>> {
  return t.run((ctx) =>
    ctx.db.insert('providers', {
      name: overrides.name ?? 'openai',
      models: overrides.models ?? ['gpt-4o'],
      status: overrides.status ?? 'active',
      ...(overrides.healthStatus !== undefined
        ? { healthStatus: overrides.healthStatus }
        : {}),
      ...(overrides.latency !== undefined ? { latency: overrides.latency } : {}),
      ...(overrides.baseUrl !== undefined ? { baseUrl: overrides.baseUrl } : {}),
      ...(overrides.defaultModels !== undefined
        ? { defaultModels: overrides.defaultModels }
        : {}),
      lastCheckedAt: overrides.lastCheckedAt ?? 0,
      failureCount: overrides.failureCount ?? 0,
      avgLatencyMs: overrides.avgLatencyMs ?? 0,
      lastSuccessAt: overrides.lastSuccessAt ?? 0,
      createdAt: overrides.createdAt ?? 1_000,
    }),
  );
}

describe('providers registered runtime contracts', () => {
  it('uses the shared authenticated identity for provider CRUD and real indexes', async () => {
    const t = createConvexTest();
    const identity = await t.run((ctx) => ctx.auth.getUserIdentity());
    expect(identity).toMatchObject({
      tokenIdentifier: 'test-user',
      subject: 'test-user',
    });

    const firstId = await createProvider(t, {
      name: 'openai',
      models: ['gpt-4o', 'gpt-4o-mini'],
      baseUrl: 'https://api.openai.test',
      defaultModels: ['gpt-4o'],
    });
    const secondId = await createProvider(t, {
      name: 'anthropic',
      models: ['claude-sonnet'],
      latency: 180,
    });

    const listed = await t.query(api.providers.listProvidersHandler, {});
    expect(listed).toHaveLength(2);
    expect(listed.map((provider) => provider.name)).toEqual(
      expect.arrayContaining(['openai', 'anthropic']),
    );
    expect(listed.every((provider) => provider._creationTime === undefined)).toBe(true);

    const created = await t.query(api.providers.getProviderHandler, { id: firstId });
    expect(created).toMatchObject({
      _id: firstId,
      name: 'openai',
      models: ['gpt-4o', 'gpt-4o-mini'],
      status: 'active',
      healthStatus: 'healthy',
      baseUrl: 'https://api.openai.test',
      defaultModels: ['gpt-4o'],
    });

    await t.mutation(api.providers.updateProviderHandler, {
      id: firstId,
      models: ['gpt-4o'],
      latency: 250,
    });
    await t.mutation(api.providers.updateProviderStatusHandler, {
      id: firstId,
      status: 'rate_limited',
    });

    const updated = await t.query(api.providers.getProviderHandler, { id: firstId });
    expect(updated).toMatchObject({
      name: 'openai',
      models: ['gpt-4o'],
      latency: 250,
      status: 'rate_limited',
    });
    expect(updated?.healthStatus).toBe('healthy');
    expect(await t.query(api.providers.getProviderHandler, { id: secondId })).toMatchObject({
      name: 'anthropic',
      latency: 180,
    });
  });

  it('keeps operational status separate from healthy, degraded, and unhealthy health states', async () => {
    const t = createConvexTest();
    const providerId = await createProvider(t, { name: 'health-provider' });

    await t.mutation(api.providers.updateProviderStatusHandler, {
      id: providerId,
      status: 'rate_limited',
    });
    await t.mutation(api.providers.updateProviderHealth, {
      providerId,
      latencyMs: 250,
      success: true,
    });
    let provider = await t.query(api.providers.getProviderHandler, { id: providerId });
    expect(provider).toMatchObject({ status: 'rate_limited', healthStatus: 'healthy' });
    expect(provider?.avgLatencyMs).toBeCloseTo(75);

    await t.mutation(api.providers.updateProviderHealth, {
      providerId,
      latencyMs: 40_000,
      success: true,
    });
    provider = await t.query(api.providers.getProviderHandler, { id: providerId });
    expect(provider).toMatchObject({ status: 'rate_limited', healthStatus: 'degraded' });

    await t.mutation(api.providers.updateProviderStatusHandler, {
      id: providerId,
      status: 'idle',
    });
    await t.run((ctx) =>
      ctx.db.patch(providerId, {
        failureCount: 2,
        lastSuccessAt: Date.now() - 10 * 60 * 1000,
        avgLatencyMs: 0,
      }),
    );
    await t.mutation(api.providers.updateProviderHealth, {
      providerId,
      latencyMs: 5_000,
      success: false,
      errorMessage: 'connection refused',
    });

    provider = await t.query(api.providers.getProviderHandler, { id: providerId });
    expect(provider).toMatchObject({ status: 'idle', healthStatus: 'unhealthy' });
    expect(provider?.failureCount).toBe(3);

    const healthRows = await t.query(api.providers.getProviderHealth, {});
    expect(healthRows).toHaveLength(1);
    expect(healthRows[0]).toMatchObject({
      _id: providerId,
      status: 'idle',
      healthStatus: 'unhealthy',
      latency: 5_000,
    });

    const history = await t.query(api.providers.getProviderHistory, {
      providerId,
      limit: 10,
    });
    expect(history).toHaveLength(3);
    expect(history.some((row) => row.healthStatus === 'healthy')).toBe(true);
    expect(history.some((row) => row.healthStatus === 'degraded')).toBe(true);
    expect(history.find((row) => row.errorMessage === 'connection refused')).toMatchObject({
      status: 'unhealthy',
      healthStatus: 'unhealthy',
      success: false,
    });
  });

  it('uses the provider history index to isolate providers and enforce bounded limits', async () => {
    const t = createConvexTest();
    const providerId = await createProvider(t, { name: 'history-provider' });
    const otherProviderId = await createProvider(t, { name: 'other-provider' });

    for (let index = 0; index < 5; index += 1) {
      await t.mutation(api.providers.updateProviderHealth, {
        providerId,
        latencyMs: 100 + index,
        success: true,
      });
    }
    await t.mutation(api.providers.updateProviderHealth, {
      providerId: otherProviderId,
      latencyMs: 999,
      success: true,
    });

    const bounded = await t.query(api.providers.getProviderHistory, {
      providerId,
      limit: 3,
    });
    expect(bounded).toHaveLength(3);
    expect(bounded.every((row) => row.providerId === providerId)).toBe(true);
    expect(bounded.every((row) => row._creationTime === undefined)).toBe(true);
    expect(
      await t.query(api.providers.getProviderHistory, { providerId, limit: 0 }),
    ).toEqual([]);
    expect(
      await t.query(api.providers.getProviderHistory, {
        providerId: otherProviderId,
        limit: 20,
      }),
    ).toHaveLength(1);
  });

  it('backfills missing health status from the latest indexed probe and is idempotent', async () => {
    const t = createConvexTest();
    const defaultedId = await seedProvider(t, { name: 'defaulted' });
    const probedId = await seedProvider(t, { name: 'probed' });
    const existingId = await seedProvider(t, {
      name: 'existing',
      healthStatus: 'degraded',
      status: 'rate_limited',
    });

    await t.run(async (ctx) => {
      await ctx.db.insert('providerHealthHistory', {
        providerId: probedId,
        providerName: 'probed',
        latencyMs: 100,
        success: true,
        status: 'healthy',
        checkedAt: 100,
      });
      await ctx.db.insert('providerHealthHistory', {
        providerId: probedId,
        providerName: 'probed',
        latencyMs: 20_000,
        success: true,
        status: 'unhealthy',
        checkedAt: 200,
      });
    });

    const first = await t.mutation(api.providers.backfillProviderHealthStatus, {});
    expect(first).toEqual({ backfilledCount: 2 });
    expect(
      await t.query(api.providers.getProviderHandler, { id: defaultedId }),
    ).toMatchObject({ healthStatus: 'healthy' });
    expect(
      await t.query(api.providers.getProviderHandler, { id: probedId }),
    ).toMatchObject({ healthStatus: 'unhealthy' });
    expect(
      await t.query(api.providers.getProviderHandler, { id: existingId }),
    ).toMatchObject({ healthStatus: 'degraded', status: 'rate_limited' });

    const second = await t.mutation(api.providers.backfillProviderHealthStatus, {});
    expect(second).toEqual({ backfilledCount: 0 });
  });

  it('records and returns bounded fallback events through registered APIs', async () => {
    const t = createConvexTest();

    await t.mutation(api.providers.createFallbackEvent, {
      taskKey: 'task-1',
      fallbackFrom: 'openai',
      fallbackTo: 'anthropic',
      fallbackReason: 'rate limited',
      attemptNumber: 1,
    });
    await t.mutation(api.providers.createFallbackEvent, {
      taskKey: 'task-2',
      fallbackFrom: 'anthropic',
      fallbackTo: 'openai',
      fallbackReason: 'health check failed',
      attemptNumber: 2,
    });

    const history = await t.query(api.providers.getFallbackHistory, { limit: 10 });
    expect(history).toHaveLength(2);
    expect(history).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taskKey: 'task-1',
          fallbackFrom: 'openai',
          fallbackTo: 'anthropic',
          attemptNumber: 1,
        }),
        expect.objectContaining({
          taskKey: 'task-2',
          fallbackFrom: 'anthropic',
          fallbackTo: 'openai',
          attemptNumber: 2,
        }),
      ]),
    );
    expect(await t.query(api.providers.getFallbackHistory, { limit: 1 })).toHaveLength(1);
  });
});
