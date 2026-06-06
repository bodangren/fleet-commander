import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { QueryCtx, MutationCtx } from './_generated/server';
import { employeeStatus, runStatus, taskStatus } from './lib/validators';

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
  status: employeeStatus,
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

/**
 * Query handler returning all tasks with status ready or backlog
 * @param ctx - Convex query context
 * @returns Array of tasks in ready or backlog status
 */
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

/**
 * Query handler returning all employees with active status
 * @param ctx - Convex query context
 * @returns Array of employees with active status
 */
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

/**
 * Mutation handler that creates a new run entry assigning an employee to a task
 * @param ctx - Convex mutation context
 * @param args - Object containing taskId and employeeId
 * @returns The ID of the newly created run
 */
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
    taskId: v.id('tasks'),
    employeeId: v.id('employees'),
  },
  returns: v.id('runs'),
  handler: createRunHandler,
});

/**
 * Mutation handler that updates a task status and updatedAt timestamp
 * @param ctx - Convex mutation context
 * @param args - Object containing taskId and new status
 * @returns null
 */
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
    taskId: v.id('tasks'),
    status: taskStatus,
  },
  returns: v.null(),
  handler: updateTaskStatusHandler,
});

/**
 * Query handler returning the most recent run for a given taskId
 * @param ctx - Convex query context
 * @param args - Object containing taskId
 * @returns The most recent run or null if none exists
 */
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
  args: { taskId: v.id('tasks') },
  returns: v.union(runResponse, v.null()),
  handler: getRunByTaskHandler,
});
