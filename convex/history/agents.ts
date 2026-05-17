import { v } from 'convex/values';
import { query } from '../_generated/server';

const agentHistoryResponse = v.object({
  _id: v.id('agents'),
  name: v.string(),
  role: v.string(),
  skills: v.array(v.string()),
  model: v.string(),
  costPerPoint: v.number(),
  reliability: v.number(),
  status: v.string(),
  workload: v.number(),
  maxWorkload: v.number(),
  tasksCompleted: v.number(),
  totalCost: v.number(),
  avgLatencyMs: v.number(),
  createdAt: v.number(),
});

export const listAgentHistoryHandler = query({
  args: {
    projectId: v.optional(v.id('projects')),
    limit: v.optional(v.number()),
  },
  returns: v.array(agentHistoryResponse),
  handler: async (ctx, args) => {
    let agents = await ctx.db.query('agents').order('desc').collect();

    if (args.limit != null) {
      agents = agents.slice(0, args.limit);
    }

    let tasks: any[] = [];
    if (args.projectId) {
      tasks = await ctx.db
        .query('tasks')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId!))
        .collect();
    }

    const pipelineRuns = await ctx.db.query('pipelineRuns').collect();

    const runsByAgent = new Map<string, any[]>();
    for (const run of pipelineRuns) {
      if (args.projectId) {
        const task = tasks.find((t: any) => t._id === run.taskId);
        if (!task) continue;
      }
      const list = runsByAgent.get(run.agentId) ?? [];
      list.push(run);
      runsByAgent.set(run.agentId, list);
    }

    return agents.map((doc) => {
      const runs = runsByAgent.get(doc._id) ?? [];
      const tasksCompleted = runs.filter((r) => r.status === 'completed').length;
      const totalCost = runs.reduce((sum: number, r) => sum + (r.cost ?? 0), 0);
      let avgLatencyMs = 0;
      if (runs.length > 0) {
        const totalLatency = runs.reduce(
          (sum: number, r) => sum + ((r.endTime ?? 0) - (r.startTime ?? 0)),
          0
        );
        avgLatencyMs = totalLatency / runs.length;
      }
      const { _creationTime, ...rest } = doc as any;
      return {
        ...rest,
        tasksCompleted,
        totalCost,
        avgLatencyMs,
      };
    });
  },
});

export const getAgentHistoryHandler = query({
  args: { id: v.id('agents') },
  returns: v.union(v.null(), agentHistoryResponse),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;

    const pipelineRuns = await ctx.db.query('pipelineRuns').collect();
    const agentRuns = pipelineRuns.filter((r) => r.agentId === args.id);

    const tasksCompleted = agentRuns.filter((r) => r.status === 'completed').length;
    const totalCost = agentRuns.reduce((sum: number, r) => sum + (r.cost ?? 0), 0);
    let avgLatencyMs = 0;
    if (agentRuns.length > 0) {
      const totalLatency = agentRuns.reduce(
        (sum: number, r) => sum + ((r.endTime ?? 0) - (r.startTime ?? 0)),
        0
      );
      avgLatencyMs = totalLatency / agentRuns.length;
    }

    const { _creationTime, ...rest } = doc as any;
    return {
      ...rest,
      tasksCompleted,
      totalCost,
      avgLatencyMs,
    };
  },
});