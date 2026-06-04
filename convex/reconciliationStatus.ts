import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { resolveActor } from './lib/auth';

const STUCK_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export const getReconciliationStatus = query({
  args: {
    projectSlug: v.string(),
  },
  returns: v.object({
    divergenceCount: v.number(),
    stuckTaskCount: v.number(),
    orphanSprintCount: v.number(),
    lastSweepAt: v.optional(v.number()),
    stuckTasks: v.array(v.object({
      taskId: v.string(),
      title: v.string(),
      updatedAt: v.number(),
    })),
    orphanSprints: v.array(v.object({
      sprintId: v.string(),
      name: v.string(),
      completedCount: v.number(),
    })),
  }),
  handler: async (ctx, args) => {
    await resolveActor(ctx);

    const divergences = await ctx.db
      .query('reconciliationEvents')
      .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug))
      .take(100);

    const project = await ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', args.projectSlug))
      .first();

    const stuckTasks: Array<{ taskId: string; title: string; updatedAt: number }> = [];
    const orphanSprints: Array<{ sprintId: string; name: string; completedCount: number }> = [];

    if (project) {
      const now = Date.now();

      // Find stuck tasks: in_progress for >30min without a running pipeline run
      const inProgressTasks = await ctx.db
        .query('tasks')
        .withIndex('by_status', (q) => q.eq('status', 'in_progress'))
        .take(100);

      for (const task of inProgressTasks) {
        if (task.projectId !== project._id) continue;
        const elapsed = now - task.updatedAt;
        if (elapsed < STUCK_THRESHOLD_MS) continue;

        const runningRun = await ctx.db
          .query('pipelineRuns')
          .withIndex('by_task_and_status', (q) => q.eq('taskId', task._id).eq('status', 'running'))
          .first();

        if (!runningRun) {
          stuckTasks.push({
            taskId: task._id as string,
            title: task.title,
            updatedAt: task.updatedAt,
          });
        }
      }

      // Find orphan sprints: active with no ready/in_progress tasks but has completed tasks
      const activeSprints = await ctx.db
        .query('sprints')
        .withIndex('by_project', (q) => q.eq('projectId', project._id))
        .filter((q) => q.eq(q.field('status'), 'active'))
        .take(50);

      // Fetch all tasks for the project in one query, then group by sprint
      const allProjectTasks = await ctx.db
        .query('tasks')
        .withIndex('by_project', (q) => q.eq('projectId', project._id))
        .collect();

      const tasksBySprint = new Map<string, typeof allProjectTasks>();
      for (const task of allProjectTasks) {
        if (!task.sprintId) continue;
        const existing = tasksBySprint.get(task.sprintId) ?? [];
        existing.push(task);
        tasksBySprint.set(task.sprintId, existing);
      }

      for (const sprint of activeSprints) {
        const sprintTasks = tasksBySprint.get(sprint._id) ?? [];

        const hasInProgressOrReady = sprintTasks.some(
          (t) => t.status === 'in_progress' || t.status === 'ready',
        );
        const completedCount = sprintTasks.filter((t) => t.status === 'done').length;

        if (!hasInProgressOrReady && completedCount > 0) {
          orphanSprints.push({
            sprintId: sprint._id as string,
            name: sprint.name,
            completedCount,
          });
        }
      }
    }

    // Find last sweep time from most recent reconciliation event
    const lastEvent = await ctx.db
      .query('reconciliationEvents')
      .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug))
      .order('desc')
      .first();

    return {
      divergenceCount: divergences.length,
      stuckTaskCount: stuckTasks.length,
      orphanSprintCount: orphanSprints.length,
      lastSweepAt: lastEvent?.createdAt,
      stuckTasks,
      orphanSprints,
    };
  },
});

export const repairStuckTasks = mutation({
  args: {
    projectSlug: v.string(),
  },
  returns: v.object({
    repaired: v.number(),
    taskIds: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    await resolveActor(ctx);

    const project = await ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', args.projectSlug))
      .first();

    if (!project) {
      return { repaired: 0, taskIds: [] };
    }

    const now = Date.now();
    const repairedIds: string[] = [];

    const inProgressTasks = await ctx.db
      .query('tasks')
      .withIndex('by_status', (q) => q.eq('status', 'in_progress'))
      .take(100);

    for (const task of inProgressTasks) {
      if (task.projectId !== project._id) continue;
      const elapsed = now - task.updatedAt;
      if (elapsed < STUCK_THRESHOLD_MS) continue;

      const runningRun = await ctx.db
        .query('pipelineRuns')
        .withIndex('by_task_and_status', (q) => q.eq('taskId', task._id).eq('status', 'running'))
        .first();

      if (!runningRun) {
        await ctx.db.patch(task._id, {
          status: 'ready',
          updatedAt: now,
        });
        repairedIds.push(task._id as string);
      }
    }

    return { repaired: repairedIds.length, taskIds: repairedIds };
  },
});

export const closeOrphanSprints = mutation({
  args: {
    projectSlug: v.string(),
  },
  returns: v.object({
    closed: v.number(),
    sprintIds: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    await resolveActor(ctx);

    const project = await ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', args.projectSlug))
      .first();

    if (!project) {
      return { closed: 0, sprintIds: [] };
    }

    const now = Date.now();
    const closedIds: string[] = [];

    const activeSprints = await ctx.db
      .query('sprints')
      .withIndex('by_project', (q) => q.eq('projectId', project._id))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .take(50);

    for (const sprint of activeSprints) {
      const sprintTasks = await ctx.db
        .query('tasks')
        .withIndex('by_sprint', (q) => q.eq('sprintId', sprint._id))
        .take(100);

      const hasInProgressOrReady = sprintTasks.some(
        (t) => t.status === 'in_progress' || t.status === 'ready',
      );
      const completedCount = sprintTasks.filter((t) => t.status === 'done').length;

      if (!hasInProgressOrReady && completedCount > 0) {
        await ctx.db.patch(sprint._id, {
          status: 'closed',
          closedAt: now,
        });
        closedIds.push(sprint._id as string);
      }
    }

    return { closed: closedIds.length, sprintIds: closedIds };
  },
});
