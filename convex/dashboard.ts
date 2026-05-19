import { v } from 'convex/values';
import { query } from './_generated/server';

export const getDashboardDataHandler = query({
  args: { projectId: v.optional(v.id('projects')) },
  returns: v.object({
    sprint: v.union(
      v.null(),
      v.object({
        _id: v.id('sprints'),
        name: v.string(),
        status: v.string(),
        budget: v.number(),
        actualCost: v.number(),
        pointsDelivered: v.number(),
        taskCount: v.number(),
        completedCount: v.number(),
      }),
    ),
    tasks: v.array(
      v.object({
        _id: v.id('tasks'),
        title: v.string(),
        status: v.string(),
        storyPoints: v.number(),
        actualCost: v.optional(v.number()),
        assigneeId: v.optional(v.id('agents')),
        priority: v.string(),
      }),
    ),
    agents: v.array(
      v.object({
        _id: v.id('agents'),
        name: v.string(),
        role: v.string(),
        status: v.string(),
        workload: v.number(),
        maxWorkload: v.number(),
      }),
    ),
    pipelineRuns: v.array(
      v.object({
        _id: v.id('pipelineRuns'),
        taskId: v.id('tasks'),
        stage: v.string(),
        agentId: v.optional(v.id('agents')),
        startTime: v.number(),
        endTime: v.optional(v.number()),
        cost: v.optional(v.number()),
        status: v.string(),
      }),
    ),
    alerts: v.array(
      v.object({
        _id: v.id('alerts'),
        type: v.string(),
        severity: v.string(),
        message: v.string(),
        createdAt: v.number(),
      }),
    ),
    metrics: v.object({
      deliveryRate: v.number(),
      successRate: v.number(),
      avgPipelineTime: v.number(),
      rejectionRate: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    // Resolve project
    let projectId = args.projectId;
    if (!projectId) {
      const projects = await ctx.db.query('projects').collect();
      const firstProject = projects[0] ?? null;
      if (!firstProject) {
        return {
          sprint: null,
          tasks: [],
          agents: [],
          pipelineRuns: [],
          alerts: [],
          metrics: { deliveryRate: 0, successRate: 0, avgPipelineTime: 0, rejectionRate: 0 },
        };
      }
      projectId = firstProject._id;
    }

    // Find active sprint for the project
    const sprints = await ctx.db
      .query('sprints')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect();
    const activeSprint = sprints.find((s) => s.status === 'active') ?? null;

    // Fetch tasks for the sprint (or all project tasks if no active sprint)
    const allProjectTasks = await ctx.db
      .query('tasks')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect();

    const sprintTasks = activeSprint
      ? allProjectTasks.filter((t: any) => t.sprintId === activeSprint._id)
      : allProjectTasks;

    const tasks = sprintTasks.map((doc: any) => {
      const { _creationTime, projectId: _pid, sprintId: _sid, description: _desc, costEstimate: _ce, reviewerId: _rid, mergerId: _mid, createdAt: _ca, updatedAt: _ua, ...rest } = doc;
      return rest;
    });

    // Fetch all agents
    const agentDocs = await ctx.db.query('agents').collect();
    const agents = agentDocs.map((doc: any) => {
      const { _creationTime, skills: _sk, model: _md, costPerPoint: _cpp, reliability: _rel, createdAt: _ca, ...rest } = doc;
      return rest;
    });

    // Fetch recent pipeline runs for sprint tasks (limit to 20 most recent)
    const taskIds = new Set(sprintTasks.map((t: any) => t._id));
    const allRuns = await ctx.db.query('pipelineRuns').collect();
    const sortedRuns = allRuns.sort((a: any, b: any) => b.startTime - a.startTime);
    const pipelineRuns = sortedRuns
      .filter((r: any) => taskIds.has(r.taskId))
      .slice(0, 20)
      .map((doc: any) => {
        const { _creationTime, createdAt: _ca, ...rest } = doc;
        return rest;
      });

    // Fetch unresolved alerts
    const allAlerts = await ctx.db
      .query('alerts')
      .withIndex('by_resolved', (q) => q.eq('resolved', false))
      .collect();
    const alertDocs = allAlerts.sort((a: any, b: any) => b.createdAt - a.createdAt).slice(0, 10);
    const alerts = alertDocs.map((doc: any) => {
      const { _creationTime, resolved: _res, resolvedAt: _ra, contextJson: _ctx, ...rest } = doc;
      return rest;
    });

    // Compute metrics
    const totalPoints = sprintTasks.reduce((sum: number, t: any) => sum + t.storyPoints, 0);
    const doneTasks = sprintTasks.filter((t: any) => t.status === 'done');
    const donePoints = doneTasks.reduce((sum: number, t: any) => sum + t.storyPoints, 0);
    const actualCost = sprintTasks.reduce((sum: number, t: any) => sum + (t.actualCost ?? 0), 0);

    const deliveryRate = actualCost > 0 ? donePoints / actualCost : 0;
    const successRate = sprintTasks.length > 0 ? (doneTasks.length / sprintTasks.length) * 100 : 0;

    const completedRuns = pipelineRuns.filter((r: any) => r.status === 'completed' && r.endTime);
    const avgPipelineTime =
      completedRuns.length > 0
        ? completedRuns.reduce((sum: number, r: any) => sum + (r.endTime - r.startTime), 0) /
          completedRuns.length
        : 0;

    const blockedTasks = sprintTasks.filter((t: any) => t.status === 'blocked');
    const failedRuns = pipelineRuns.filter((r: any) => r.status === 'failed');
    const rejectionRate =
      sprintTasks.length > 0
        ? ((blockedTasks.length + failedRuns.length) / sprintTasks.length) * 100
        : 0;

    // Build sprint response
    const sprint = activeSprint
      ? {
          _id: activeSprint._id,
          name: activeSprint.name,
          status: activeSprint.status,
          budget: activeSprint.budget,
          actualCost,
          pointsDelivered: donePoints,
          taskCount: sprintTasks.length,
          completedCount: doneTasks.length,
        }
      : null;

    return {
      sprint,
      tasks,
      agents,
      pipelineRuns,
      alerts,
      metrics: {
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        successRate: Math.round(successRate * 10) / 10,
        avgPipelineTime: Math.round(avgPipelineTime),
        rejectionRate: Math.round(rejectionRate * 10) / 10,
      },
    };
  },
});
