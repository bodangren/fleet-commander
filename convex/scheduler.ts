import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { QueryCtx, MutationCtx } from './_generated/server';
import { taskStatus, runStatus } from './lib/validators';

const taskResponse = v.object({
  _id: v.id('tasks'),
  title: v.string(),
  description: v.string(),
  status: taskStatus,
  priority: v.string(),
  assignee: v.optional(v.id('employees')),
  projectId: v.id('projects'),
  spec: v.optional(v.string()),
  skills: v.optional(v.array(v.string())),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const employeeResponse = v.object({
  _id: v.id('employees'),
  name: v.string(),
  role: v.string(),
  skills: v.array(v.string()),
  model: v.string(),
  status: v.union(v.literal('active'), v.literal('away')),
  createdAt: v.number(),
});

const runResponse = v.object({
  _id: v.id('runs'),
  taskId: v.id('tasks'),
  employeeId: v.id('employees'),
  status: runStatus,
  output: v.optional(v.string()),
  startedAt: v.number(),
  finishedAt: v.optional(v.number()),
});

export async function listReadyTasksHandler(ctx: QueryCtx) {
  const docs = await ctx.db
    .query('tasks')
    .withIndex('by_status', (q) => q.eq('status', 'ready'))
    .collect();
  return docs;
}

export const listReadyTasks = query({
  args: {},
  returns: v.array(taskResponse),
  handler: listReadyTasksHandler,
});

export async function listActiveEmployeesHandler(ctx: QueryCtx) {
  const docs = await ctx.db
    .query('employees')
    .withIndex('by_status', (q) => q.eq('status', 'active'))
    .collect();
  return docs;
}

export const listActiveEmployees = query({
  args: {},
  returns: v.array(employeeResponse),
  handler: listActiveEmployeesHandler,
});

export async function createRunHandler(
  ctx: MutationCtx,
  args: { taskId: string; employeeId: string },
) {
  const id = await ctx.db.insert('runs', {
    taskId: args.taskId as any,
    employeeId: args.employeeId as any,
    status: 'queued',
    startedAt: Date.now(),
  });
  return id;
}

export const createRun = mutation({
  args: {
    taskId: v.string(),
    employeeId: v.string(),
  },
  returns: v.id('runs'),
  handler: createRunHandler,
});

export async function updateTaskStatusHandler(
  ctx: MutationCtx,
  args: { taskId: string; status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked' },
) {
  await ctx.db.patch(args.taskId as any, {
    status: args.status,
    updatedAt: Date.now(),
  });
  return null;
}

export const updateTaskStatus = mutation({
  args: {
    taskId: v.string(),
    status: taskStatus,
  },
  returns: v.null(),
  handler: updateTaskStatusHandler,
});

export async function getRunByTaskHandler(ctx: QueryCtx, args: { taskId: string }) {
  const runs = await ctx.db
    .query('runs')
    .withIndex('by_task', (q) => q.eq('taskId', args.taskId as any))
    .collect();

  if (runs.length === 0) return null;

  let mostRecent = runs[0];
  for (const run of runs) {
    if ((run.finishedAt ?? run.startedAt) > (mostRecent.finishedAt ?? mostRecent.startedAt)) {
      mostRecent = run;
    }
  }
  return mostRecent;
}

export const getRunByTask = query({
  args: { taskId: v.string() },
  returns: v.union(runResponse, v.null()),
  handler: getRunByTaskHandler,
});