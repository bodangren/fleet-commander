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

/**
 * Atomically creates a bounded sprint and assigns its one selected task.
 * @param ctx - Convex mutation context
 * @param args - Project, sprint, task, and agent selection
 * @returns Created sprint and assigned task identifiers
 */
export const createSprintHandler = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.string(),
    budget: v.number(),
    taskId: v.id('tasks'),
    agentId: v.id('agents'),
  },
  returns: v.object({
    sprintId: v.id('sprints'),
    taskId: v.id('tasks'),
  }),
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (!args.name.trim()) {
      throw new Error('Sprint name is required');
    }
    if (!Number.isFinite(args.budget) || args.budget < 0) {
      throw new Error('Budget must be finite and non-negative');
    }

    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error('Task not found');
    }
    if (task.projectId !== args.projectId) {
      throw new Error('Task does not belong to project');
    }
    if (task.status !== 'backlog') {
      throw new Error('Task must be in backlog');
    }
    if (task.sprintId) {
      throw new Error('Task already belongs to a sprint');
    }

    const projectTasks = await ctx.db
      .query('tasks')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(500);
    const taskByKey = new Map(
      projectTasks.flatMap((projectTask) =>
        projectTask.taskKey ? [[projectTask.taskKey, projectTask] as const] : [],
      ),
    );
    for (const dependencyKey of task.dependencies ?? []) {
      const dependency = taskByKey.get(dependencyKey);
      if (!dependency || dependency.status !== 'done') {
        throw new Error(`Unmet task dependency: ${dependencyKey}`);
      }
    }

    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }
    if (agent.status !== 'active') {
      throw new Error('Agent is not active');
    }
    if (agent.workload >= agent.maxWorkload) {
      throw new Error('Agent workload exceeded');
    }

    const costEstimate = task.storyPoints * agent.costPerPoint;
    if (!Number.isFinite(costEstimate) || args.budget < costEstimate) {
      throw new Error('Budget is insufficient');
    }

    const now = Date.now();
    const sprintId = await ctx.db.insert('sprints', {
      projectId: args.projectId,
      name: args.name,
      status: 'active',
      budget: args.budget,
      actualCost: 0,
      pointsDelivered: 0,
      taskCount: 1,
      completedCount: 0,
      createdAt: now,
      startedAt: now,
    });

    await ctx.db.patch(args.taskId, {
      sprintId,
      assigneeId: args.agentId,
      assigneeName: agent.name,
      status: 'ready',
      costEstimate,
      updatedAt: now,
    });

    await ctx.db.patch(args.agentId, { workload: agent.workload + 1 });

    return { sprintId, taskId: args.taskId };
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
