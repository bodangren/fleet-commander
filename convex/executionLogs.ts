import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';
import { runStatus } from './lib/validators';

const logEntry = v.object({
  projectSlug: v.string(),
  runId: v.string(),
  trackId: v.optional(v.string()),
  status: runStatus,
  summary: v.string(),
  rawOutput: v.optional(v.string()),
  createdAt: v.number(),
});

export const appendLog = mutation({
  args: {
    projectSlug: v.string(),
    runId: v.string(),
    trackId: v.optional(v.string()),
    status: runStatus,
    summary: v.string(),
    rawOutput: v.optional(v.string()),
  },
  returns: logEntry,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const next = {
      projectSlug: args.projectSlug,
      runId: args.runId,
      trackId: args.trackId,
      status: args.status,
      summary: args.summary,
      rawOutput: args.rawOutput,
      createdAt: Date.now(),
    };

    await ctx.db.insert('executionLogs', next);
    return next;
  },
});

export const listLogsByProject = query({
  args: {
    projectSlug: v.string(),
    runId: v.optional(v.string()),
  },
  returns: v.array(logEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    let logs = await ctx.db.query('executionLogs').order('desc').take(500);
    logs = logs.filter((entry) => entry.projectSlug === args.projectSlug);
    if (args.runId) logs = logs.filter((entry) => entry.runId === args.runId);

    return logs.map((entry) => ({
      projectSlug: entry.projectSlug,
      runId: entry.runId,
      trackId: entry.trackId,
      status: entry.status,
      summary: entry.summary,
      rawOutput: entry.rawOutput,
      createdAt: entry.createdAt,
    }));
  },
});

export const listRecentLogs = query({
  args: {},
  returns: v.array(logEntry),
  handler: async (ctx) => {
    await resolveActor(ctx);
    const logs = await ctx.db.query('executionLogs').order('desc').take(50);
    return logs.map((entry) => ({
      projectSlug: entry.projectSlug,
      runId: entry.runId,
      trackId: entry.trackId,
      status: entry.status,
      summary: entry.summary,
      rawOutput: entry.rawOutput,
      createdAt: entry.createdAt,
    }));
  },
});
