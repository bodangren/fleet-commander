import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { query, mutation } from './_generated/server';
import { priority } from './lib/validators';

const backlogTaskValidator = v.object({
  _id: v.id('tasks'),
  title: v.string(),
  description: v.string(),
  storyPoints: v.number(),
  priority,
  costEstimate: v.number(),
  status: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
  projectSlug: v.optional(v.string()),
  trackId: v.optional(v.string()),
  taskKey: v.optional(v.string()),
  dependencies: v.array(v.string()),
  sessionId: v.optional(v.string()),
  assigneeName: v.optional(v.string()),
  blockerReason: v.optional(v.string()),
  rejectionReason: v.optional(v.string()),
  claimedAt: v.optional(v.number()),
  claimedByRunId: v.optional(v.string()),
});

type BacklogTask = {
  _id: Id<'tasks'>;
  title: string;
  description: string;
  storyPoints: number;
  priority: Doc<'tasks'>['priority'];
  costEstimate: number;
  status: string;
  createdAt: number;
  updatedAt: number;
  projectSlug?: string;
  trackId?: string;
  taskKey?: string;
  dependencies: string[];
  sessionId?: string;
  assigneeName?: string;
  blockerReason?: string;
  rejectionReason?: string;
  claimedAt?: number;
  claimedByRunId?: string;
};

function toBacklogTask(doc: Doc<'tasks'>): BacklogTask {
  return {
    _id: doc._id,
    title: doc.title,
    description: doc.description,
    storyPoints: doc.storyPoints,
    priority: doc.priority,
    costEstimate: doc.costEstimate,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    dependencies: doc.dependencies ?? [],
    ...(doc.projectSlug === undefined ? {} : { projectSlug: doc.projectSlug }),
    ...(doc.trackId === undefined ? {} : { trackId: doc.trackId }),
    ...(doc.taskKey === undefined ? {} : { taskKey: doc.taskKey }),
    ...(doc.sessionId === undefined ? {} : { sessionId: doc.sessionId }),
    ...(doc.assigneeName === undefined ? {} : { assigneeName: doc.assigneeName }),
    ...(doc.blockerReason === undefined ? {} : { blockerReason: doc.blockerReason }),
    ...(doc.rejectionReason === undefined ? {} : { rejectionReason: doc.rejectionReason }),
    ...(doc.claimedAt === undefined ? {} : { claimedAt: doc.claimedAt }),
    ...(doc.claimedByRunId === undefined ? {} : { claimedByRunId: doc.claimedByRunId }),
  };
}

export const getBacklogTasksHandler = query({
  args: { projectId: v.id('projects') },
  returns: v.array(backlogTaskValidator),
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query('tasks')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(500);

    return docs.filter((doc) => doc.status === 'backlog').map(toBacklogTask);
  },
});

export const getAgentsForPlanningHandler = query({
  args: {},
  returns: v.array(
    v.object({
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
    }),
  ),
  handler: async (ctx) => {
    const docs = await ctx.db.query('agents').take(100);
    return docs.map((doc) => ({
      _id: doc._id,
      name: doc.name,
      role: doc.role,
      skills: doc.skills,
      model: doc.model,
      costPerPoint: doc.costPerPoint,
      reliability: doc.reliability,
      status: doc.status,
      workload: doc.workload,
      maxWorkload: doc.maxWorkload,
    }));
  },
});

export const createSprintHandler = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.string(),
    budget: v.number(),
  },
  returns: v.id('sprints'),
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    const now = Date.now();
    return ctx.db.insert('sprints', {
      projectId: args.projectId,
      name: args.name,
      status: 'active',
      budget: args.budget,
      actualCost: 0,
      pointsDelivered: 0,
      taskCount: 0,
      completedCount: 0,
      createdAt: now,
      startedAt: now,
    });
  },
});

export const assignTasksToSprintHandler = mutation({
  args: {
    sprintId: v.id('sprints'),
    taskIds: v.array(v.id('tasks')),
    agentAssignments: v.array(
      v.object({
        taskId: v.id('tasks'),
        agentId: v.id('agents'),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sprint = await ctx.db.get(args.sprintId);
    if (!sprint) throw new Error('Sprint not found');

    const now = Date.now();

    for (const assignment of args.agentAssignments) {
      const task = await ctx.db.get(assignment.taskId);
      if (!task) continue;

      const agent = await ctx.db.get(assignment.agentId);
      if (!agent) continue;

      const costEstimate = task.storyPoints * agent.costPerPoint;

      await ctx.db.patch(assignment.taskId, {
        sprintId: args.sprintId,
        assigneeId: assignment.agentId,
        status: 'ready',
        costEstimate,
        updatedAt: now,
      });
    }

    // Update sprint stats
    await ctx.db.patch(args.sprintId, {
      taskCount: sprint.taskCount + args.taskIds.length,
    });

    return null;
  },
});

export const getProjectStatsHandler = query({
  args: { projectId: v.id('projects') },
  returns: v.object({
    backlogCount: v.number(),
    totalPoints: v.number(),
    activeSprintCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query('tasks')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(500);

    const backlogTasks = tasks.filter((t) => t.status === 'backlog');
    const backlogCount = backlogTasks.length;
    const totalPoints = backlogTasks.reduce((sum, t) => sum + t.storyPoints, 0);

    const sprints = await ctx.db
      .query('sprints')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(100);

    const activeSprintCount = sprints.filter((s) => s.status === 'active').length;

    return { backlogCount, totalPoints, activeSprintCount };
  },
});
