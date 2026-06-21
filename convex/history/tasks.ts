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
    let docs = await ctx.db
      .query('tasks')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(limit);

    if (args.status) {
      docs = docs.filter((d) => d.status === args.status);
    }

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      docs = docs.filter((d) =>
        d.title.toLowerCase().includes(searchLower)
      );
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