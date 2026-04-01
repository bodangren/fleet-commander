import { v } from 'convex/values';
import { query } from './_generated/server';
import { resolveActor } from './lib/auth';
import { issueStatus } from './lib/validators';

const issueResponse = v.object({
  projectSlug: v.string(),
  trackId: v.optional(v.string()),
  issueId: v.string(),
  title: v.string(),
  body: v.string(),
  status: issueStatus,
  assignedAgent: v.optional(v.string()),
  sourcePath: v.optional(v.string()),
  openedAt: v.number(),
  resolvedAt: v.optional(v.number()),
  updatedAt: v.number(),
});

export const listIssuesByProject = query({
  args: { projectSlug: v.string() },
  returns: v.array(issueResponse),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const docs = await ctx.db
      .query('issues')
      .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug))
      .order('desc')
      .collect();
    return docs.map((doc) => ({
      projectSlug: doc.projectSlug,
      trackId: doc.trackId,
      issueId: doc.issueId,
      title: doc.title,
      body: doc.body,
      status: doc.status,
      assignedAgent: doc.assignedAgent,
      sourcePath: doc.sourcePath,
      openedAt: doc.openedAt,
      resolvedAt: doc.resolvedAt,
      updatedAt: doc.updatedAt,
    }));
  },
});

export const getIssueById = query({
  args: { issueId: v.string() },
  returns: v.union(issueResponse, v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('issues')
      .withIndex('by_issue_id', (q) => q.eq('issueId', args.issueId))
      .unique();
    if (!doc) return null;
    return {
      projectSlug: doc.projectSlug,
      trackId: doc.trackId,
      issueId: doc.issueId,
      title: doc.title,
      body: doc.body,
      status: doc.status,
      assignedAgent: doc.assignedAgent,
      sourcePath: doc.sourcePath,
      openedAt: doc.openedAt,
      resolvedAt: doc.resolvedAt,
      updatedAt: doc.updatedAt,
    };
  },
});
