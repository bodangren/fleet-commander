import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';
import { continuousModeState } from './lib/validators';

export const getContinuousModeStatus = query({
  args: {},
  returns: v.object({
    enabled: v.boolean(),
    state: continuousModeState,
    intervalMs: v.number(),
    consecutiveFailures: v.number(),
    maxConcurrent: v.number(),
  }),
  handler: async (ctx) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('settings')
      .withIndex('by_scope_and_key', (q) =>
        q.eq('scope', 'orchestrator').eq('key', 'continuousMode'),
      )
      .unique();

    if (!doc) {
      return {
        enabled: false,
        state: 'idle' as const,
        intervalMs: 60_000,
        consecutiveFailures: 0,
        maxConcurrent: 1,
      };
    }

    try {
      const parsed = JSON.parse(doc.valueJson);
      return {
        enabled: parsed.enabled ?? false,
        state: parsed.state ?? 'idle',
        intervalMs: parsed.intervalMs ?? 60_000,
        consecutiveFailures: parsed.consecutiveFailures ?? 0,
        maxConcurrent: parsed.maxConcurrent ?? 1,
      };
    } catch {
      return {
        enabled: false,
        state: 'idle' as const,
        intervalMs: 60_000,
        consecutiveFailures: 0,
        maxConcurrent: 1,
      };
    }
  },
});

export const setContinuousMode = mutation({
  args: {
    enabled: v.boolean(),
    state: v.optional(continuousModeState),
    intervalMs: v.optional(v.number()),
    maxConcurrent: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('settings')
      .withIndex('by_scope_and_key', (q) =>
        q.eq('scope', 'orchestrator').eq('key', 'continuousMode'),
      )
      .unique();

    const currentState = existing
      ? (() => {
          try {
            return JSON.parse(existing.valueJson);
          } catch {
            return {};
          }
        })()
      : {};

    const value = {
      enabled: args.enabled,
      state: args.state ?? currentState.state ?? 'idle',
      intervalMs: args.intervalMs ?? currentState.intervalMs ?? 60_000,
      consecutiveFailures: currentState.consecutiveFailures ?? 0,
      maxConcurrent: args.maxConcurrent ?? currentState.maxConcurrent ?? 1,
    };

    const next = {
      scope: 'orchestrator',
      key: 'continuousMode',
      valueJson: JSON.stringify(value),
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, next);
    } else {
      await ctx.db.insert('settings', next);
    }
    return null;
  },
});

export const setOrchestratorInterval = mutation({
  args: {
    intervalMs: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const minMs = 10_000;
    const maxMs = 3_600_000;
    const clamped = Math.max(minMs, Math.min(maxMs, args.intervalMs));

    const existing = await ctx.db
      .query('settings')
      .withIndex('by_scope_and_key', (q) =>
        q.eq('scope', 'orchestrator').eq('key', 'continuousMode'),
      )
      .unique();

    const currentState = existing
      ? (() => {
          try {
            return JSON.parse(existing.valueJson);
          } catch {
            return {};
          }
        })()
      : {};

    const value = {
      enabled: currentState.enabled ?? false,
      state: currentState.state ?? 'idle',
      intervalMs: clamped,
      consecutiveFailures: currentState.consecutiveFailures ?? 0,
      maxConcurrent: currentState.maxConcurrent ?? 1,
    };

    const next = {
      scope: 'orchestrator',
      key: 'continuousMode',
      valueJson: JSON.stringify(value),
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, next);
    } else {
      await ctx.db.insert('settings', next);
    }
    return null;
  },
});

export const updateContinuousFailures = mutation({
  args: {
    consecutiveFailures: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('settings')
      .withIndex('by_scope_and_key', (q) =>
        q.eq('scope', 'orchestrator').eq('key', 'continuousMode'),
      )
      .unique();

    if (!existing) return null;

    const currentState = (() => {
      try {
        return JSON.parse(existing.valueJson);
      } catch {
        return {};
      }
    })();

    const value = {
      enabled: currentState.enabled ?? false,
      state: currentState.state ?? 'idle',
      intervalMs: currentState.intervalMs ?? 60_000,
      consecutiveFailures: args.consecutiveFailures,
      maxConcurrent: currentState.maxConcurrent ?? 1,
    };

    await ctx.db.patch(existing._id, {
      valueJson: JSON.stringify(value),
      updatedAt: Date.now(),
    });
    return null;
  },
});
