import { v } from 'convex/values';
import { query } from '../_generated/server';
import type { Doc } from '../_generated/dataModel';
import { resolveActor } from '../lib/auth';
import { taskStatus } from '../lib/validators';

/**
 * Return contract for task history rows, including catalog metadata imported
 * from a project manifest.
 */
export const taskHistoryResponse = v.object({
  _id: v.id('tasks'),
  projectId: v.id('projects'),
  sprintId: v.optional(v.id('sprints')),
  title: v.string(),
  description: v.string(),
  storyPoints: v.number(),
  status: taskStatus,
  priority: v.string(),
  costEstimate: v.number(),
  actualCost: v.optional(v.number()),
  assigneeId: v.optional(v.id('agents')),
  agent: v.optional(v.string()),
  projectSlug: v.optional(v.string()),
  trackId: v.optional(v.string()),
  taskKey: v.optional(v.string()),
  dependencies: v.optional(v.array(v.string())),
  createdAt: v.number(),
  updatedAt: v.number(),
});

function toTaskHistoryResponse(doc: Doc<'tasks'>, agentName?: string) {
  return {
    _id: doc._id,
    projectId: doc.projectId,
    sprintId: doc.sprintId,
    title: doc.title,
    description: doc.description,
    storyPoints: doc.storyPoints,
    status: doc.status,
    priority: doc.priority,
    costEstimate: doc.costEstimate,
    actualCost: doc.actualCost,
    assigneeId: doc.assigneeId,
    agent: agentName,
    projectSlug: doc.projectSlug,
    trackId: doc.trackId,
    taskKey: doc.taskKey,
    dependencies: doc.dependencies,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const listTaskHistoryHandler = query({
  args: {
    projectId: v.id('projects'),
    status: v.optional(taskStatus),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(taskHistoryResponse),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    const limit = args.limit ?? 100;
    const searchLower = args.search?.toLowerCase();

    // Apply indexed filters before the limit bound. This keeps status-only
    // history queries from dropping older matching rows and makes the
    // combined status/search path intersect both filters before returning.
    let docs: Array<Doc<'tasks'>>;

    if (args.status) {
      // The composite index narrows the read to this project and status.
      // Search is applied to a bounded overscan so it cannot make the query
      // unbounded while still returning matching rows from the recent set.
      const candidateLimit = args.search ? limit * 4 : limit;
      const statusRows = await ctx.db
        .query('tasks')
        .withIndex('by_project_and_status', (q) =>
          q.eq('projectId', args.projectId).eq('status', args.status!),
        )
        .order('desc')
        .take(candidateLimit);
      docs = searchLower
        ? statusRows
            .filter((d) => d.title.toLowerCase().includes(searchLower))
            .slice(0, limit)
        : statusRows;
    } else if (args.search) {
      // Without a status filter, over-fetch from the by_project index and
      // filter by search in app code, then truncate to `limit`. The 4x
      // overscan keeps the read bounded while allowing sparse matches.
      const projectRows = await ctx.db
        .query('tasks')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .order('desc')
        .take(limit * 4);
      docs = projectRows
        .filter((d) => d.title.toLowerCase().includes(searchLower!))
        .slice(0, limit);
    } else {
      // No filters: simple by_project + take(limit).
      docs = await ctx.db
        .query('tasks')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .order('desc')
        .take(limit);
    }

    const assigneeIds = [
      ...new Set(
        docs.flatMap((doc) => (doc.assigneeId ? [doc.assigneeId] : [])),
      ),
    ];
    const agents = await Promise.all(assigneeIds.map((id) => ctx.db.get(id)));
    const agentMap = new Map(
      agents
        .filter((agent): agent is Doc<'agents'> => agent !== null)
        .map((agent) => [agent._id, agent.name] as const),
    );

    return docs.map((doc) =>
      toTaskHistoryResponse(doc, doc.assigneeId ? agentMap.get(doc.assigneeId) : undefined),
    );
  },
});

export const getTaskHistoryHandler = query({
  args: { id: v.id('tasks') },
  returns: v.union(v.null(), taskHistoryResponse),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;

    const agent = doc.assigneeId ? await ctx.db.get(doc.assigneeId) : null;
    return toTaskHistoryResponse(
      doc,
      agent?.name,
    );
  },
});
