import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';
import { trackStatus } from './lib/validators';

const trackSnapshot = v.object({
  projectSlug: v.string(),
  projectId: v.optional(v.id('projects')),
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
      projectId: doc.projectId,
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

/**
 * Returns the minimal context payload an orchestrator agent needs to execute a
 * task inside a track: the parent track's title, spec markdown, and plan
 * markdown. Returns null when the track does not exist.
 */
export const getTrackContext = query({
  args: {
    projectSlug: v.string(),
    trackId: v.string(),
  },
  returns: v.union(
    v.object({
      title: v.string(),
      specMarkdown: v.string(),
      planMarkdown: v.string(),
    }),
    v.null(),
  ),
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
      title: doc.title,
      specMarkdown: doc.specMarkdown,
      planMarkdown: doc.planMarkdown,
    };
  },
});

export const upsertTrackSnapshot = mutation({
  args: {
    projectSlug: v.string(),
    projectId: v.optional(v.id('projects')),
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
      projectId: args.projectId,
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

/**
 * Build a seed spec markdown body anchored on a track title and goal.
 * @param title - Human-readable track title
 * @param goal - One-sentence goal description
 * @returns Spec markdown scaffold with Goal, Functional Requirements, Acceptance Criteria sections
 */
function buildSeedSpec(title: string, goal: string): string {
  return [
    `# ${title}`,
    '',
    'Status: new',
    '',
    '## Goal',
    '',
    goal.trim(),
    '',
    '## Functional Requirements',
    '',
    '- FR1.1 (TBD)',
    '',
    '## Acceptance Criteria',
    '',
    '- AC1 (TBD)',
    '',
  ].join('\n');
}

/**
 * Build a seed plan markdown body with Contract-First + TDD scaffolding.
 * @returns Plan markdown scaffold with a single Phase 1 placeholder
 */
function buildSeedPlan(): string {
  return [
    '# Implementation Plan',
    '',
    'Status: new',
    '',
    'Methodology: Contract-First + TDD. Tests precede implementation; commit per task.',
    '',
    '## Phase 1 — TBD',
    '',
    '- [ ] **1.1** Contract',
    '- [ ] **1.2** Red',
    '- [ ] **1.3** Green',
    '- [ ] **1.4** Commit',
    '',
  ].join('\n');
}

export const createTrack = mutation({
  args: {
    projectSlug: v.string(),
    projectId: v.optional(v.id('projects')),
    trackId: v.string(),
    title: v.string(),
    goal: v.string(),
  },
  returns: trackSnapshot,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('tracks')
      .withIndex('by_project_and_track', (q) =>
        q.eq('projectSlug', args.projectSlug).eq('trackId', args.trackId),
      )
      .unique();

    if (existing) {
      throw new ConvexError({
        code: 'TRACK_ALREADY_EXISTS',
        message: `Track ${args.trackId} already exists in project ${args.projectSlug}`,
      });
    }

    const now = Date.now();
    const next = {
      projectSlug: args.projectSlug,
      projectId: args.projectId,
      trackId: args.trackId,
      title: args.title,
      status: 'new' as const,
      specMarkdown: buildSeedSpec(args.title, args.goal),
      planMarkdown: buildSeedPlan(),
      version: 1,
      updatedAt: now,
    };

    await ctx.db.insert('tracks', next);
    return next;
  },
});

export const clearTracksForProject = mutation({
  args: { projectSlug: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const docs = await ctx.db
      .query('tracks')
      .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug))
      .collect();

    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }

    return docs.length;
  },
});
