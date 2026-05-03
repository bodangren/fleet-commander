import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';

const harnessProfileEntry = v.object({
  name: v.string(),
  binary: v.string(),
  discoveryCommand: v.optional(v.string()),
  discoveryParseStrategy: v.optional(v.string()),
  discoveryPattern: v.optional(v.string()),
  discoveryNotes: v.optional(v.string()),
  invocationTemplate: v.string(),
  invocationFlagsJson: v.string(),
  capabilitiesJson: v.string(),
  policyJson: v.string(),
  beforeRunHook: v.optional(v.string()),
  afterRunHook: v.optional(v.string()),
  afterCreateHook: v.optional(v.string()),
  updatedAt: v.number(),
});

export const upsertProfile = mutation({
  args: {
    name: v.string(),
    binary: v.string(),
    discoveryCommand: v.optional(v.string()),
    discoveryParseStrategy: v.optional(v.string()),
    discoveryPattern: v.optional(v.string()),
    discoveryNotes: v.optional(v.string()),
    invocationTemplate: v.string(),
    invocationFlags: v.record(v.string(), v.string()),
    capabilities: v.object({
      supportedTaskClasses: v.array(v.union(v.literal('feature'), v.literal('bug'), v.literal('chore'), v.literal('review'))),
      supportsContinuousMode: v.boolean(),
      maxConcurrentTasks: v.number(),
      supportedLlmProviders: v.array(v.string()),
    }),
    policy: v.object({
      allowed_task_classes: v.array(v.union(v.literal('feature'), v.literal('bug'), v.literal('chore'), v.literal('review'))),
      concurrency_limit: v.number(),
      retry_with_human_review_on_failure: v.boolean(),
    }),
    beforeRunHook: v.optional(v.string()),
    afterRunHook: v.optional(v.string()),
    afterCreateHook: v.optional(v.string()),
  },
  returns: harnessProfileEntry,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query('harnessProfiles')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .first();

    const entry = {
      name: args.name,
      binary: args.binary,
      discoveryCommand: args.discoveryCommand,
      discoveryParseStrategy: args.discoveryParseStrategy,
      discoveryPattern: args.discoveryPattern,
      discoveryNotes: args.discoveryNotes,
      invocationTemplate: args.invocationTemplate,
      invocationFlagsJson: JSON.stringify(args.invocationFlags),
      capabilitiesJson: JSON.stringify(args.capabilities),
      policyJson: JSON.stringify(args.policy),
      beforeRunHook: args.beforeRunHook,
      afterRunHook: args.afterRunHook,
      afterCreateHook: args.afterCreateHook,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, entry);
      return { ...existing, ...entry };
    } else {
      await ctx.db.insert('harnessProfiles', entry);
      return entry;
    }
  },
});

export const getProfile = query({
  args: { name: v.string() },
  returns: v.union(harnessProfileEntry, v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('harnessProfiles')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .first();
    return doc;
  },
});

export const listProfiles = query({
  args: {},
  returns: v.array(harnessProfileEntry),
  handler: async (ctx) => {
    await resolveActor(ctx);
    const docs = await ctx.db
      .query('harnessProfiles')
      .take(100);
    return docs;
  },
});

export const deleteProfile = mutation({
  args: { name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('harnessProfiles')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});