import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';

export const getCircuitBreaker = query({
  args: {
    agentId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('circuitBreakers'),
      agentId: v.string(),
      state: v.union(
        v.literal('closed'),
        v.literal('open'),
        v.literal('half-open'),
      ),
      failureCount: v.number(),
      failureWindowStart: v.number(),
      openedAt: v.optional(v.number()),
      failureThreshold: v.number(),
      windowMs: v.number(),
      halfOpenTimeoutMs: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('circuitBreakers')
      .withIndex('by_agent_id', (q) => q.eq('agentId', args.agentId))
      .unique();

    if (!doc) return null;

    return {
      _id: doc._id,
      agentId: doc.agentId,
      state: doc.state,
      failureCount: doc.failureCount,
      failureWindowStart: doc.failureWindowStart,
      openedAt: doc.openedAt,
      failureThreshold: doc.failureThreshold,
      windowMs: doc.windowMs,
      halfOpenTimeoutMs: doc.halfOpenTimeoutMs,
      updatedAt: doc.updatedAt,
    };
  },
});

export const getAllCircuitBreakers = query({
  args: {},
  returns: v.array(
    v.object({
      agentId: v.string(),
      state: v.union(
        v.literal('closed'),
        v.literal('open'),
        v.literal('half-open'),
      ),
      failureCount: v.number(),
      failureWindowStart: v.number(),
      openedAt: v.optional(v.number()),
      failureThreshold: v.number(),
      windowMs: v.number(),
      halfOpenTimeoutMs: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    await resolveActor(ctx);
    const docs = await ctx.db.query('circuitBreakers').collect();
    return docs.map((doc) => ({
      agentId: doc.agentId,
      state: doc.state,
      failureCount: doc.failureCount,
      failureWindowStart: doc.failureWindowStart,
      openedAt: doc.openedAt,
      failureThreshold: doc.failureThreshold,
      windowMs: doc.windowMs,
      halfOpenTimeoutMs: doc.halfOpenTimeoutMs,
      updatedAt: doc.updatedAt,
    }));
  },
});

export const initCircuitBreaker = mutation({
  args: {
    agentId: v.string(),
    failureThreshold: v.optional(v.number()),
    windowMs: v.optional(v.number()),
    halfOpenTimeoutMs: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('circuitBreakers')
      .withIndex('by_agent_id', (q) => q.eq('agentId', args.agentId))
      .unique();

    if (existing) return null;

    await ctx.db.insert('circuitBreakers', {
      agentId: args.agentId,
      state: 'closed',
      failureCount: 0,
      failureWindowStart: Date.now(),
      failureThreshold: args.failureThreshold ?? 3,
      windowMs: args.windowMs ?? 300_000,
      halfOpenTimeoutMs: args.halfOpenTimeoutMs ?? 60_000,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const recordCircuitFailure = mutation({
  args: {
    agentId: v.string(),
  },
  returns: v.object({
    state: v.union(
      v.literal('closed'),
      v.literal('open'),
      v.literal('half-open'),
    ),
    failureCount: v.number(),
    justOpened: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const now = Date.now();
    const doc = await ctx.db
      .query('circuitBreakers')
      .withIndex('by_agent_id', (q) => q.eq('agentId', args.agentId))
      .unique();

    if (!doc) {
      const newDoc = await ctx.db.insert('circuitBreakers', {
        agentId: args.agentId,
        state: 'closed',
        failureCount: 1,
        failureWindowStart: now,
        failureThreshold: 3,
        windowMs: 300_000,
        halfOpenTimeoutMs: 60_000,
        updatedAt: now,
      });
      return { state: 'closed' as const, failureCount: 1, justOpened: false };
    }

    const { state, failureWindowStart, windowMs, failureThreshold } = doc;

    let currentFailures = doc.failureCount;
    let currentWindowStart = doc.failureWindowStart;

    if (now - failureWindowStart > windowMs) {
      currentFailures = 0;
      currentWindowStart = now;
    }

    currentFailures++;
    const justOpened = state !== 'open' && currentFailures >= failureThreshold;
    const newState = justOpened ? 'open' : state;

    await ctx.db.patch(doc._id, {
      state: newState,
      failureCount: currentFailures,
      failureWindowStart: currentWindowStart,
      openedAt: justOpened ? now : doc.openedAt,
      updatedAt: now,
    });

    return {
      state: newState,
      failureCount: currentFailures,
      justOpened,
    };
  },
});

export const resetCircuitBreaker = mutation({
  args: {
    agentId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('circuitBreakers')
      .withIndex('by_agent_id', (q) => q.eq('agentId', args.agentId))
      .unique();

    if (!doc) return null;

    await ctx.db.patch(doc._id, {
      state: 'closed',
      failureCount: 0,
      failureWindowStart: Date.now(),
      openedAt: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const recordCircuitSuccess = mutation({
  args: {
    agentId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('circuitBreakers')
      .withIndex('by_agent_id', (q) => q.eq('agentId', args.agentId))
      .unique();

    if (!doc) return null;

    if (doc.state === 'half-open') {
      await ctx.db.patch(doc._id, {
        state: 'closed',
        failureCount: 0,
        failureWindowStart: Date.now(),
        openedAt: undefined,
        updatedAt: Date.now(),
      });
    } else if (doc.state === 'closed') {
      await ctx.db.patch(doc._id, {
        failureCount: 0,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const evaluateCircuitState = mutation({
  args: {
    agentId: v.string(),
  },
  returns: v.union(
    v.literal('closed'),
    v.literal('open'),
    v.literal('half-open'),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('circuitBreakers')
      .withIndex('by_agent_id', (q) => q.eq('agentId', args.agentId))
      .unique();

    if (!doc) return 'closed';
    if (doc.state !== 'open') return doc.state;

    const now = Date.now();
    const openedAt = doc.openedAt ?? doc.failureWindowStart;
    if (now - openedAt > doc.halfOpenTimeoutMs) {
      await ctx.db.patch(doc._id, {
        state: 'half-open',
        updatedAt: now,
      });
      return 'half-open';
    }

    return 'open';
  },
});
