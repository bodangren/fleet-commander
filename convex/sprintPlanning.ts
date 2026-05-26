import { v } from 'convex/values';
import { query, mutation } from './_generated/server';

export const getBacklogTasksHandler = query({
  args: { projectId: v.id('projects') },
  returns: v.array(
    v.object({
      _id: v.id('tasks'),
      title: v.string(),
      description: v.string(),
      storyPoints: v.number(),
      priority: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
      costEstimate: v.number(),
      status: v.string(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query('tasks')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .filter((q) => q.eq(q.field('status'), 'backlog'))
      .collect();

    return docs.map((doc) => {
      const { _creationTime, projectId, sprintId, assigneeId, reviewerId, mergerId, actualCost, updatedAt, ...rest } = doc as any;
      return rest;
    });
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
    const docs = await ctx.db.query('agents').collect();
    return docs.map((doc) => {
      const { _creationTime, createdAt, ...rest } = doc as any;
      return rest;
    });
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
    let totalPoints = 0;

    for (const assignment of args.agentAssignments) {
      const task = await ctx.db.get(assignment.taskId);
      if (!task) continue;

      const agent = await ctx.db.get(assignment.agentId);
      if (!agent) continue;

      const costEstimate =
        (task.storyPoints as number) * (agent.costPerPoint as number);

      await ctx.db.patch(assignment.taskId, {
        sprintId: args.sprintId,
        assigneeId: assignment.agentId,
        status: 'ready',
        costEstimate,
        updatedAt: now,
      });

      totalPoints += task.storyPoints as number;
    }

    // Update sprint stats
    await ctx.db.patch(args.sprintId, {
      taskCount: (sprint.taskCount as number) + args.taskIds.length,
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
      .collect();

    const backlogTasks = tasks.filter((t) => t.status === 'backlog');
    const backlogCount = backlogTasks.length;
    const totalPoints = backlogTasks.reduce((sum, t) => sum + t.storyPoints, 0);

    const sprints = await ctx.db
      .query('sprints')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();

    const activeSprintCount = sprints.filter((s) => s.status === 'active').length;

    return { backlogCount, totalPoints, activeSprintCount };
  },
});
