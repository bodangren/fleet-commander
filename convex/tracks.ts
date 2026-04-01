import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';
import { trackStatus } from './lib/validators';

const trackSnapshot = v.object({
  projectSlug: v.string(),
  trackId: v.string(),
  title: v.string(),
  status: trackStatus,
  specMarkdown: v.string(),
  planMarkdown: v.string(),
  version: v.number(),
  updatedAt: v.number(),
});

export const getTrackSnapshot = query({
  args: {
    projectSlug: v.string(),
    trackId: v.string(),
  },
  returns: v.union(trackSnapshot, v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('tracks')
      .withIndex('by_project_and_track', (q) =>
        q.eq('projectSlug', args.projectSlug).eq('trackId', args.trackId),
      )
      .unique();

    if (!doc) {
      return null;
    }

    return {
      projectSlug: doc.projectSlug,
      trackId: doc.trackId,
      title: doc.title,
      status: doc.status,
      specMarkdown: doc.specMarkdown,
      planMarkdown: doc.planMarkdown,
      version: doc.version,
      updatedAt: doc.updatedAt,
    };
  },
});

export const upsertTrackSnapshot = mutation({
  args: {
    projectSlug: v.string(),
    trackId: v.string(),
    title: v.string(),
    status: trackStatus,
    expectedVersion: v.optional(v.number()),
    specMarkdown: v.string(),
    planMarkdown: v.string(),
  },
  returns: trackSnapshot,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query('tracks')
      .withIndex('by_project_and_track', (q) =>
        q.eq('projectSlug', args.projectSlug).eq('trackId', args.trackId),
      )
      .unique();

    if (
      existing &&
      args.expectedVersion !== undefined &&
      existing.version !== args.expectedVersion
    ) {
      throw new ConvexError({
        code: 'TRACK_VERSION_CONFLICT',
        message: `Expected version ${args.expectedVersion}, current ${existing.version}`,
      });
    }

    const version = existing ? existing.version + 1 : 1;
    const next = {
      projectSlug: args.projectSlug,
      trackId: args.trackId,
      title: args.title,
      status: args.status,
      specMarkdown: args.specMarkdown,
      planMarkdown: args.planMarkdown,
      version,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, next);
    } else {
      await ctx.db.insert('tracks', next);
    }

    return next;
  },
});
