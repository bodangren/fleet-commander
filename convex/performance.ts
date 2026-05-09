import { v } from 'convex/values';
import { query } from './_generated/server';
import { resolveActor } from './lib/auth';
import {
  computePhaseBreakdown,
  computePhaseTrends,
  computeAgentLatencyStats,
  detectSlowAgents,
  computeBaselineSnapshots,
  computeRegressions,
  type BaselineSnapshot,
} from './lib/performance';

const MS_PER_DAY = 86400000;

export const getPhaseBreakdown = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
    agent: v.optional(v.string()),
  },
  returns: v.object({
    load: v.object({ p50: v.number(), p95: v.number(), p99: v.number() }),
    score: v.object({ p50: v.number(), p95: v.number(), p99: v.number() }),
    execute: v.object({ p50: v.number(), p95: v.number(), p99: v.number() }),
    persist: v.object({ p50: v.number(), p95: v.number(), p99: v.number() }),
    hookBefore: v.object({ p50: v.number(), p95: v.number(), p99: v.number() }),
    hookAfter: v.object({ p50: v.number(), p95: v.number(), p99: v.number() }),
    total: v.object({ p50: v.number(), p95: v.number(), p99: v.number() }),
  }),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const days = args.days ?? 30;
    const cutoff = Date.now() - days * MS_PER_DAY;

    let workQuery = ctx.db
      .query('workRuns')
      .withIndex('by_started_at', (q) => q.gte('startedAt', cutoff));
    if (args.projectSlug) {
      workQuery = ctx.db
        .query('workRuns')
        .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug!))
        .filter((q) => q.gte(q.field('startedAt'), cutoff));
    }

    const runs = await workQuery.collect();
    const filtered = args.agent
      ? runs.filter((r) => r.runnerHost === args.agent)
      : runs;
    return computePhaseBreakdown(filtered);
  },
});

export const getPhaseTrends = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
    agent: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      date: v.string(),
      loadAvg: v.number(),
      scoreAvg: v.number(),
      executeAvg: v.number(),
      persistAvg: v.number(),
      hookBeforeAvg: v.number(),
      hookAfterAvg: v.number(),
      totalAvg: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const days = args.days ?? 30;
    const now = Date.now();
    const cutoff = now - days * MS_PER_DAY;

    let workQuery = ctx.db
      .query('workRuns')
      .withIndex('by_started_at', (q) => q.gte('startedAt', cutoff));
    if (args.projectSlug) {
      workQuery = ctx.db
        .query('workRuns')
        .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug!))
        .filter((q) => q.gte(q.field('startedAt'), cutoff));
    }

    const runs = await workQuery.collect();
    const filtered = args.agent
      ? runs.filter((r) => r.runnerHost === args.agent)
      : runs;
    return computePhaseTrends(filtered, now, days);
  },
});

export const getAgentLatencyStats = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      agent: v.string(),
      p95: v.number(),
      p50: v.number(),
      avg: v.number(),
      runCount: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const days = args.days ?? 7;
    const cutoff = Date.now() - days * MS_PER_DAY;

    let workQuery = ctx.db
      .query('workRuns')
      .withIndex('by_started_at', (q) => q.gte('startedAt', cutoff));
    if (args.projectSlug) {
      workQuery = ctx.db
        .query('workRuns')
        .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug!))
        .filter((q) => q.gte(q.field('startedAt'), cutoff));
    }

    const runs = await workQuery.collect();
    return computeAgentLatencyStats(runs);
  },
});

export const getSlowAgents = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
    thresholdMultiplier: v.optional(v.number()),
    minConsecutiveBreaches: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      agent: v.string(),
      p95: v.number(),
      currentAvg: v.number(),
      threshold: v.number(),
      consecutiveBreaches: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const days = args.days ?? 7;
    const cutoff = Date.now() - days * MS_PER_DAY;

    let workQuery = ctx.db
      .query('workRuns')
      .withIndex('by_started_at', (q) => q.gte('startedAt', cutoff));
    if (args.projectSlug) {
      workQuery = ctx.db
        .query('workRuns')
        .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug!))
        .filter((q) => q.gte(q.field('startedAt'), cutoff));
    }

    const runs = await workQuery.collect();
    return detectSlowAgents(runs, {
      thresholdMultiplier: args.thresholdMultiplier ?? 1.5,
      minConsecutiveBreaches: args.minConsecutiveBreaches ?? 3,
    });
  },
});

export const getRegressionAlerts = query({
  args: {
    days: v.optional(v.number()),
    projectSlug: v.optional(v.string()),
    degradationThreshold: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      agent: v.string(),
      taskKind: v.string(),
      baselineAvgMs: v.number(),
      currentAvgMs: v.number(),
      degradationPercent: v.number(),
      sampleCount: v.number(),
      threshold: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const days = args.days ?? 7;
    const windowDays = 7;
    const degradationThreshold = args.degradationThreshold ?? 0.2;
    const now = Date.now();
    const cutoff = now - days * MS_PER_DAY;
    const baselineCutoff = now - windowDays * MS_PER_DAY;

    let currentQuery = ctx.db
      .query('workRuns')
      .withIndex('by_started_at', (q) => q.gte('startedAt', cutoff));
    if (args.projectSlug) {
      currentQuery = ctx.db
        .query('workRuns')
        .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug!))
        .filter((q) => q.gte(q.field('startedAt'), cutoff));
    }
    const currentRuns = await currentQuery.collect();

    let baselineQuery = ctx.db
      .query('workRuns')
      .withIndex('by_started_at', (q) => q.gte('startedAt', baselineCutoff));
    if (args.projectSlug) {
      baselineQuery = ctx.db
        .query('workRuns')
        .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug!))
        .filter((q) => q.gte(q.field('startedAt'), baselineCutoff));
    }
    const baselineRuns = await baselineQuery.collect();

    const baselineSnapshots = computeBaselineSnapshots(baselineRuns, windowDays);
    const alerts = computeRegressions(currentRuns, baselineSnapshots, degradationThreshold);

    return alerts.map((a) => ({
      agent: a.agent,
      taskKind: a.taskKind,
      baselineAvgMs: a.baselineAvgMs,
      currentAvgMs: a.currentAvgMs,
      degradationPercent: a.degradationPercent,
      sampleCount: a.sampleCount,
      threshold: a.threshold,
    }));
  },
});
