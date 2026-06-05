import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { providerStatus } from './lib/validators';

const providerResponse = v.object({
  _id: v.id('providers'),
  name: v.string(),
  models: v.array(v.string()),
  status: v.string(),
  latency: v.optional(v.number()),
  baseUrl: v.optional(v.string()),
  defaultModels: v.optional(v.array(v.string())),
  lastCheckedAt: v.optional(v.number()),
  failureCount: v.optional(v.number()),
  avgLatencyMs: v.optional(v.number()),
  lastSuccessAt: v.optional(v.number()),
  createdAt: v.number(),
});

const healthHistoryResponse = v.object({
  _id: v.id('providerHealthHistory'),
  providerId: v.id('providers'),
  providerName: v.string(),
  latencyMs: v.number(),
  success: v.boolean(),
  status: v.string(),
  errorMessage: v.optional(v.string()),
  checkedAt: v.number(),
});

export const listProvidersHandler = query({
  args: {},
  returns: v.array(providerResponse),
  handler: async (ctx) => {
    const docs = await ctx.db.query('providers').order('desc').collect();
    return docs.map((doc) => {
      const { _creationTime, ...rest } = doc as any;
      return rest;
    });
  },
});

export const getProviderHandler = query({
  args: { id: v.id('providers') },
  returns: v.union(v.null(), providerResponse),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    const { _creationTime, ...rest } = doc as any;
    return rest;
  },
});

/**
 * Returns current health status for all providers.
 * Used by the provider dashboard and model router.
 */
export const getProviderHealth = query({
  args: {},
  returns: v.array(providerResponse),
  handler: async (ctx) => {
    const docs = await ctx.db.query('providers').collect();
    return docs.map((doc) => {
      const { _creationTime, ...rest } = doc as any;
      return rest;
    });
  },
});

/**
 * Returns last N probe results for a provider.
 * Bounded with .take(N) to avoid unbounded collects.
 */
export const getProviderHistory = query({
  args: {
    providerId: v.id('providers'),
    limit: v.optional(v.number()),
  },
  returns: v.array(healthHistoryResponse),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const docs = await ctx.db
      .query('providerHealthHistory')
      .withIndex('by_provider_and_checkedAt', (q) =>
        q.eq('providerId', args.providerId),
      )
      .order('desc')
      .take(limit);
    return docs.map((doc) => {
      const { _creationTime, ...rest } = doc as any;
      return rest;
    });
  },
});

export const createProviderHandler = mutation({
  args: {
    name: v.string(),
    models: v.array(v.string()),
    latency: v.optional(v.number()),
    baseUrl: v.optional(v.string()),
    defaultModels: v.optional(v.array(v.string())),
  },
  returns: v.id('providers'),
  handler: async (ctx, args) => {
    return ctx.db.insert('providers', {
      name: args.name,
      models: args.models,
      status: 'active',
      createdAt: Date.now(),
      failureCount: 0,
      avgLatencyMs: 0,
      lastCheckedAt: 0,
      lastSuccessAt: 0,
      ...(args.latency !== undefined && { latency: args.latency }),
      ...(args.baseUrl !== undefined && { baseUrl: args.baseUrl }),
      ...(args.defaultModels !== undefined && {
        defaultModels: args.defaultModels,
      }),
    });
  },
});

export const updateProviderHandler = mutation({
  args: {
    id: v.id('providers'),
    models: v.optional(v.array(v.string())),
    latency: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {};
    if (args.models !== undefined) patch.models = args.models;
    if (args.latency !== undefined) patch.latency = args.latency;
    await ctx.db.patch(args.id, patch);
    return null;
  },
});

export const updateProviderStatusHandler = mutation({
  args: {
    id: v.id('providers'),
    status: providerStatus,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
    return null;
  },
});

/**
 * Record a health probe result and update provider state.
 * This is the primary mutation called by the ProviderHealthMonitor.
 */
export const updateProviderHealth = mutation({
  args: {
    providerId: v.id('providers'),
    latencyMs: v.number(),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return null;

    const now = Date.now();
    const alpha = 0.3;

    // Compute new health state
    const newAvgLatency = args.success
      ? (provider.avgLatencyMs ?? 0) * (1 - alpha) + args.latencyMs * alpha
      : (provider.avgLatencyMs ?? 0);

    const newFailureCount = args.success
      ? 0
      : (provider.failureCount ?? 0) + 1;

    const lastSuccessAt = args.success
      ? now
      : (provider.lastSuccessAt ?? 0);

    // Determine status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (
      newFailureCount >= 3 &&
      now - lastSuccessAt > 5 * 60 * 1000
    ) {
      status = 'unhealthy';
    } else if (newAvgLatency > 10_000) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    // Update provider record
    await ctx.db.patch(args.providerId, {
      status,
      latency: args.latencyMs,
      avgLatencyMs: newAvgLatency,
      failureCount: newFailureCount,
      lastCheckedAt: now,
      lastSuccessAt,
    });

    // Insert history record (bounded by index, old records can be pruned)
    await ctx.db.insert('providerHealthHistory', {
      providerId: args.providerId,
      providerName: provider.name,
      latencyMs: args.latencyMs,
      success: args.success,
      status,
      errorMessage: args.errorMessage,
      checkedAt: now,
    });

    return null;
  },
});

/**
 * Returns recent fallback events.
 * Bounded with .take(N) to avoid unbounded collects.
 */
export const getFallbackHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id('fallbackEvents'),
      taskKey: v.string(),
      fallbackFrom: v.string(),
      fallbackTo: v.string(),
      fallbackReason: v.string(),
      attemptNumber: v.number(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const docs = await ctx.db
      .query('fallbackEvents')
      .order('desc')
      .take(limit);
    return docs.map((doc) => {
      const { _creationTime, ...rest } = doc as any;
      return rest;
    });
  },
});

/**
 * Log a fallback event for audit trail.
 */
export const createFallbackEvent = mutation({
  args: {
    taskKey: v.string(),
    fallbackFrom: v.string(),
    fallbackTo: v.string(),
    fallbackReason: v.string(),
    attemptNumber: v.number(),
  },
  returns: v.id('fallbackEvents'),
  handler: async (ctx, args) => {
    return ctx.db.insert('fallbackEvents', {
      taskKey: args.taskKey,
      fallbackFrom: args.fallbackFrom,
      fallbackTo: args.fallbackTo,
      fallbackReason: args.fallbackReason,
      attemptNumber: args.attemptNumber,
      createdAt: Date.now(),
    });
  },
});
