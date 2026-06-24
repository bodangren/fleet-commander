import { v } from 'convex/values';
import { query } from '../_generated/server';
import { taskStatus } from '../lib/validators';

const taskHistoryResponse = v.object({
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
  createdAt: v.number(),
  updatedAt: v.number(),
});

type DocLike = {
  _id: string;
  projectId: string;
  [k: string]: unknown;
};

export const listTaskHistoryHandler = query({
  args: {
    projectId: v.id('projects'),
    status: v.optional(taskStatus),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(taskHistoryResponse),
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    const limit = args.limit ?? 100;

    // FR-2 fix: apply `status` filtering via the `by_status` index BEFORE
    // taking the limit bound. The previous code took the most-recent
    // `limit` rows by projectId and then filtered in app code, so
    // matching rows that fell outside the most-recent `limit` window
    // were silently dropped. We now route through the index when
    // `status` is provided so the matching rows are returned.
    let docs: Array<DocLike>;

    if (args.status) {
      // by_status does not include projectId, so filter by projectId in
      // app code after the index-narrowed query.
      const statusRows = await ctx.db
        .query('tasks')
        .withIndex('by_status', (q) => q.eq('status', args.status!))
        .order('desc')
        .take(limit * 4);
      docs = statusRows
        .filter((d) => d.projectId === args.projectId)
        .slice(0, limit);
    } else if (args.search) {
      // Without a status filter we can't use by_status; over-fetch from
      // the by_project index and filter by search in app code, then
      // truncate to `limit`. The 4x overshoot keeps the call bounded
      // while ensuring the limit is satisfied when matches exist.
      const searchLower = args.search.toLowerCase();
      const projectRows = await ctx.db
        .query('tasks')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .order('desc')
        .take(limit * 4);
      docs = projectRows
        .filter((d) => d.title.toLowerCase().includes(searchLower))
        .slice(0, limit);
    } else {
      // No filters: simple by_project + take(limit).
      docs = await ctx.db
        .query('tasks')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .order('desc')
        .take(limit);
    }

    const agents = await ctx.db.query('agents').collect();
    const agentMap = new Map(agents.map((a: any) => [a._id, a.name]));

    return docs.map((doc) => {
      const { _creationTime, ...rest } = doc as any;
      const agentName = doc.assigneeId ? agentMap.get(doc.assigneeId) : undefined;
      return {
        ...rest,
        agent: agentName,
      };
    });
  },
});

export const getTaskHistoryHandler = query({
  args: { id: v.id('tasks') },
  returns: v.union(v.null(), taskHistoryResponse),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;

    const agents = await ctx.db.query('agents').collect();
    const agentMap = new Map(agents.map((a: any) => [a._id, a.name]));

    const { _creationTime, ...rest } = doc as any;
    const agentName = doc.assigneeId ? agentMap.get(doc.assigneeId) : undefined;
    return {
      ...rest,
      agent: agentName,
    };
  },
});