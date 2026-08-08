import { v } from 'convex/values';
import { query } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import {
  computeBurnForecast,
  type CompletedTaskData,
} from './lib/burnForecast';
import { resolveActor } from './lib/auth';

type TaskDoc = Doc<'tasks'>;
type PipelineRunDoc = Doc<'pipelineRuns'>;

const dashboardTaskValidator = v.object({
  _id: v.id('tasks'),
  title: v.string(),
  status: v.string(),
  storyPoints: v.number(),
  actualCost: v.optional(v.number()),
  assigneeId: v.optional(v.id('agents')),
  priority: v.string(),
  projectSlug: v.optional(v.string()),
  trackId: v.optional(v.string()),
  taskKey: v.optional(v.string()),
  dependencies: v.array(v.string()),
});

type DashboardTask = {
  _id: Id<'tasks'>;
  title: string;
  status: string;
  storyPoints: number;
  actualCost?: number;
  assigneeId?: Id<'agents'>;
  priority: string;
  projectSlug?: string;
  trackId?: string;
  taskKey?: string;
  dependencies: string[];
};

function toDashboardTask(doc: TaskDoc): DashboardTask {
  return {
    _id: doc._id,
    title: doc.title,
    status: doc.status,
    storyPoints: doc.storyPoints,
    priority: doc.priority,
    dependencies: doc.dependencies ?? [],
    ...(doc.actualCost === undefined ? {} : { actualCost: doc.actualCost }),
    ...(doc.assigneeId === undefined ? {} : { assigneeId: doc.assigneeId }),
    ...(doc.projectSlug === undefined ? {} : { projectSlug: doc.projectSlug }),
    ...(doc.trackId === undefined ? {} : { trackId: doc.trackId }),
    ...(doc.taskKey === undefined ? {} : { taskKey: doc.taskKey }),
  };
}

type PipelineRunWithTask = PipelineRunDoc & { taskId: Id<'tasks'> };
type PipelineRunWithEndTime = PipelineRunWithTask & { endTime: number };

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
        burnRate: v.number(),
        projectedExhaustionMs: v.union(v.number(), v.null()),
        atRisk: v.boolean(),
        forecastConfidence: v.number(),
      }),
    ),
    tasks: v.array(dashboardTaskValidator),
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
    await resolveActor(ctx);
    // Resolve project
    let projectId = args.projectId;
    if (!projectId) {
      const projects = await ctx.db.query('projects').take(1);
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
      .take(100);
    const activeSprint = sprints.find((s) => s.status === 'active') ?? null;

    // Fetch tasks for the sprint (or all project tasks if no active sprint)
    const allProjectTasks = await ctx.db
      .query('tasks')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .take(500);

    const sprintTasks = activeSprint
      ? allProjectTasks.filter((t) => t.sprintId === activeSprint._id)
      : allProjectTasks;

    const tasks = sprintTasks.map(toDashboardTask);

    // Fetch all agents
    const agentDocs = await ctx.db.query('agents').take(100);
    const agents = agentDocs.map((doc) => ({
      _id: doc._id,
      name: doc.name,
      role: doc.role,
      status: doc.status,
      workload: doc.workload,
      maxWorkload: doc.maxWorkload,
    }));

    // Fetch recent pipeline runs for sprint tasks (limit to 20 most recent)
    const taskIds = new Set<Id<'tasks'>>(sprintTasks.map((t) => t._id));
    const allRuns = await ctx.db.query('pipelineRuns').order('desc').take(100);
    const pipelineRuns = allRuns
      .filter((r): r is PipelineRunWithTask => r.taskId !== undefined && taskIds.has(r.taskId))
      .slice(0, 20)
      .map((doc) => ({
        _id: doc._id,
        taskId: doc.taskId,
        stage: doc.stage,
        startTime: doc.startTime,
        status: doc.status,
        ...(doc.agentId === undefined ? {} : { agentId: doc.agentId }),
        ...(doc.endTime === undefined ? {} : { endTime: doc.endTime }),
        ...(doc.cost === undefined ? {} : { cost: doc.cost }),
      }));

    // Fetch unresolved alerts
    const allAlerts = await ctx.db
      .query('alerts')
      .withIndex('by_resolved', (q) => q.eq('resolved', false))
      .take(200);
    const alertDocs = allAlerts.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
    const alerts = alertDocs.map((doc) => ({
      _id: doc._id,
      type: doc.type,
      severity: doc.severity,
      message: doc.message,
      createdAt: doc.createdAt,
    }));

    // Compute metrics
    const doneTasks = sprintTasks.filter((t) => t.status === 'done');
    const donePoints = doneTasks.reduce((sum, t) => sum + t.storyPoints, 0);
    const actualCost = sprintTasks.reduce((sum, t) => sum + (t.actualCost ?? 0), 0);

    const deliveryRate = actualCost > 0 ? donePoints / actualCost : 0;
    const successRate = sprintTasks.length > 0 ? (doneTasks.length / sprintTasks.length) * 100 : 0;

    const completedRuns = pipelineRuns.filter(
      (r): r is PipelineRunWithEndTime => r.status === 'completed' && r.endTime !== undefined,
    );
    const avgPipelineTime =
      completedRuns.length > 0
        ? completedRuns.reduce((sum, r) => sum + (r.endTime - r.startTime), 0) /
          completedRuns.length
        : 0;

    const blockedTasks = sprintTasks.filter((t) => t.status === 'blocked');
    const failedRuns = pipelineRuns.filter((r) => r.status === 'failed');
    const rejectionRate =
      sprintTasks.length > 0
        ? ((blockedTasks.length + failedRuns.length) / sprintTasks.length) * 100
        : 0;

    // Compute burn forecast
    const completedTaskData: CompletedTaskData[] = doneTasks
      .filter(
        (t): t is TaskDoc & { actualCost: number } =>
          t.actualCost !== undefined && t.actualCost > 0,
      )
      .map((t) => ({
        actualCost: t.actualCost,
        completedAt: t.updatedAt,
        storyPoints: t.storyPoints,
      }));
    const forecast = activeSprint
      ? computeBurnForecast(completedTaskData, activeSprint.budget, Date.now())
      : null;

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
          burnRate: forecast?.burnRatePerHour ?? 0,
          projectedExhaustionMs: forecast?.projectedExhaustionMs ?? null,
          atRisk: forecast?.atRisk ?? false,
          forecastConfidence: forecast?.confidence ?? 0,
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
