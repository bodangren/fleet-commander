import { v } from 'convex/values';
import { query } from './_generated/server';
import { resolveActor } from './lib/auth';

export const getQueueHealth = query({
  args: {},
  returns: v.object({
    readyCount: v.number(),
    inProgressCount: v.number(),
    blockedCount: v.number(),
    doneCount: v.number(),
    starvationTasks: v.array(
      v.object({
        taskKey: v.string(),
        title: v.string(),
        status: v.string(),
        daysIdle: v.number(),
      }),
    ),
    retryHotspots: v.array(
      v.object({
        taskKey: v.string(),
        title: v.string(),
        retryCount: v.number(),
      }),
    ),
    openBlockers: v.array(
      v.object({
        issueId: v.string(),
        title: v.string(),
        daysOpen: v.number(),
      }),
    ),
  }),
  handler: async (ctx) => {
    await resolveActor(ctx);
    const now = Date.now();
    const oneDay = 86400000;
    const starvationThreshold = 7 * oneDay;

    const [readyTasks, todoTasks, inProgressTasks, blockedTasks, doneTasks] = await Promise.all([
      ctx.db.query('tasks').withIndex('by_status', (q) => q.eq('status', 'ready')).collect(),
      ctx.db.query('tasks').withIndex('by_status', (q) => q.eq('status', 'todo')).collect(),
      ctx.db.query('tasks').withIndex('by_status', (q) => q.eq('status', 'in_progress')).collect(),
      ctx.db.query('tasks').withIndex('by_status', (q) => q.eq('status', 'blocked')).collect(),
      ctx.db.query('tasks').withIndex('by_status', (q) => q.eq('status', 'done')).collect(),
    ]);

    const readyCount = readyTasks.length + todoTasks.length;
    const inProgressCount = inProgressTasks.length;
    const blockedCount = blockedTasks.length;
    const doneCount = doneTasks.length;

    const dispatchableTasks = [...readyTasks, ...todoTasks];
    const starvationTasks = dispatchableTasks
      .filter((t) => now - t.updatedAt > starvationThreshold)
      .map((t) => ({
        taskKey: t.taskKey,
        title: t.title,
        status: t.status,
        daysIdle: Math.floor((now - t.updatedAt) / oneDay),
      }))
      .sort((a, b) => b.daysIdle - a.daysIdle)
      .slice(0, 10);

    const retryHotspots = [...readyTasks, ...todoTasks, ...inProgressTasks, ...blockedTasks, ...doneTasks]
      .filter((t) => (t.retryCount ?? 0) > 0)
      .map((t) => ({
        taskKey: t.taskKey,
        title: t.title,
        retryCount: t.retryCount ?? 0,
      }))
      .sort((a, b) => b.retryCount - a.retryCount)
      .slice(0, 10);

    const [openIssues, triagedIssues] = await Promise.all([
      ctx.db.query('issues').withIndex('by_status', (q) => q.eq('status', 'open')).collect(),
      ctx.db.query('issues').withIndex('by_status', (q) => q.eq('status', 'triaged')).collect(),
    ]);

    const openBlockers = [...openIssues, ...triagedIssues]
      .map((i) => ({
        issueId: i.issueId,
        title: i.title,
        daysOpen: Math.floor((now - i.openedAt) / oneDay),
      }))
      .sort((a, b) => b.daysOpen - a.daysOpen)
      .slice(0, 10);

    return {
      readyCount,
      inProgressCount,
      blockedCount,
      doneCount,
      starvationTasks,
      retryHotspots,
      openBlockers,
    };
  },
});
