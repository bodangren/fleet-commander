import { v } from 'convex/values';
import { query } from './_generated/server';
import { Id } from './_generated/dataModel';

const taskTimelineResponse = v.object({
  task: v.union(v.null(), v.object({
    _id: v.id('tasks'),
    projectId: v.id('projects'),
    sprintId: v.optional(v.id('sprints')),
    title: v.string(),
    description: v.string(),
    storyPoints: v.number(),
    status: v.string(),
    priority: v.string(),
    costEstimate: v.number(),
    actualCost: v.optional(v.number()),
    assigneeId: v.optional(v.id('agents')),
    reviewerId: v.optional(v.id('agents')),
    mergerId: v.optional(v.id('agents')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })),
  pipelineRuns: v.array(v.object({
    _id: v.id('pipelineRuns'),
    taskId: v.id('tasks'),
    stage: v.string(),
    agentId: v.optional(v.id('agents')),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    cost: v.optional(v.number()),
    status: v.string(),
    createdAt: v.number(),
  })),
  agents: v.array(v.object({
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
    createdAt: v.number(),
  })),
  sprint: v.union(v.null(), v.object({
    _id: v.id('sprints'),
    projectId: v.id('projects'),
    name: v.string(),
    status: v.string(),
    budget: v.number(),
    actualCost: v.number(),
    pointsDelivered: v.number(),
    taskCount: v.number(),
    completedCount: v.number(),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    closedAt: v.optional(v.number()),
  })),
  project: v.union(v.null(), v.object({
    _id: v.id('projects'),
    name: v.string(),
    description: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })),
});

type WithCreationTime<T> = T & { _creationTime: number };

function omitCreationTime<T extends Record<string, unknown>>(doc: WithCreationTime<T>): T {
  const { _creationTime, ...rest } = doc;
  return rest as unknown as T;
}

export const getTaskTimelineHandler = query({
  args: { taskId: v.id('tasks') },
  returns: taskTimelineResponse,
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);

    if (!task) {
      return {
        task: null,
        pipelineRuns: [],
        agents: [],
        sprint: null,
        project: null,
      };
    }

    const pipelineRuns = await ctx.db
      .query('pipelineRuns')
      .withIndex('by_task', (q) => q.eq('taskId', args.taskId))
      .collect();

    const agentIds = new Set<Id<'agents'>>();
    if (task.assigneeId) agentIds.add(task.assigneeId);
    if (task.reviewerId) agentIds.add(task.reviewerId);
    if (task.mergerId) agentIds.add(task.mergerId);
    for (const run of pipelineRuns) {
      if (run.agentId) agentIds.add(run.agentId);
    }

    const agents: Array<{
      _id: Id<'agents'>;
      name: string;
      role: string;
      skills: string[];
      model: string;
      costPerPoint: number;
      reliability: number;
      status: string;
      workload: number;
      maxWorkload: number;
      createdAt: number;
    }> = [];

    for (const agentId of agentIds) {
      const agent = await ctx.db.get(agentId);
      if (agent) {
        agents.push(omitCreationTime(agent as unknown as WithCreationTime<typeof agent>));
      }
    }

    const sprint = task.sprintId ? await ctx.db.get(task.sprintId) : null;
    const project = await ctx.db.get(task.projectId);

    return {
      task: omitCreationTime(task as unknown as WithCreationTime<typeof task>),
      pipelineRuns: pipelineRuns.map((run) =>
        omitCreationTime(run as unknown as WithCreationTime<typeof run>)
      ).sort((a, b) => a.startTime - b.startTime),
      agents,
      sprint: sprint ? omitCreationTime(sprint as unknown as WithCreationTime<typeof sprint>) : null,
      project: project ? omitCreationTime(project as unknown as WithCreationTime<typeof project>) : null,
    };
  },
});
