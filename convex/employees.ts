import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { QueryCtx, MutationCtx } from './_generated/server';
import { resolveActor } from './lib/auth';

const employeeResponse = v.object({
  _id: v.id('employees'),
  name: v.string(),
  role: v.string(),
  skills: v.array(v.string()),
  model: v.string(),
  status: v.union(v.literal('active'), v.literal('away')),
  createdAt: v.number(),
});

/**
 * Returns all employees ordered by creation time descending
 * @param ctx - Query context
 * @returns Array of employee records without creationTime
 */
export async function listEmployeesHandler(ctx: QueryCtx) {
  await resolveActor(ctx);
  const docs = await ctx.db.query('employees').order('desc').collect();
  return docs.map(({ _creationTime, ...rest }) => rest);
}

export const listEmployees = query({
  args: {},
  returns: v.array(employeeResponse),
  handler: listEmployeesHandler,
});

/**
 * Retrieves a single employee by ID or null if not found
 * @param ctx - Query context
 * @param args - Object containing employee id
 * @returns Employee record without creationTime, or null
 */
export async function getEmployeeHandler(ctx: QueryCtx, args: { id: any }) {
  await resolveActor(ctx);
  const doc = await ctx.db.get(args.id);
  if (!doc) return null;
  const { _creationTime, ...rest } = doc;
  return rest;
}

export const getEmployee = query({
  args: { id: v.id('employees') },
  handler: getEmployeeHandler,
});

/**
 * Inserts a new employee record with name, role, skills, model (status defaults to active)
 * @param ctx - Mutation context
 * @param args - Employee creation data
 * @returns ID of newly created employee
 */
export async function createEmployeeHandler(
  ctx: MutationCtx,
  args: {
    name: string;
    role: string;
    skills: string[];
    model: string;
  },
) {
  await resolveActor(ctx);
  const id = await ctx.db.insert('employees', {
    name: args.name,
    role: args.role,
    skills: args.skills,
    model: args.model,
    status: 'active' as const,
    createdAt: Date.now(),
  });
  return id;
}

export const createEmployee = mutation({
  args: {
    name: v.string(),
    role: v.string(),
    skills: v.array(v.string()),
    model: v.string(),
  },
  returns: v.id('employees'),
  handler: createEmployeeHandler,
});

/**
 * Updates employee status field (active or away) on existing record
 * @param ctx - Mutation context
 * @param args - Object containing employee id and new status
 * @returns null
 */
export async function updateEmployeeStatusHandler(
  ctx: MutationCtx,
  args: { id: any; status: 'active' | 'away' },
) {
  await resolveActor(ctx);
  const doc = await ctx.db.get(args.id as any);
  if (doc) {
    await ctx.db.patch(doc._id, { status: args.status });
  }
  return null;
}

export const updateEmployeeStatus = mutation({
  args: {
    id: v.id('employees'),
    status: v.union(v.literal('active'), v.literal('away')),
  },
  returns: v.null(),
  handler: updateEmployeeStatusHandler,
});

/**
 * Assigns a task to an employee by updating the task assigneeId field
 * @param ctx - Mutation context
 * @param args - Object containing taskId and employeeId
 * @returns null
 */
export async function assignTaskHandler(
  ctx: MutationCtx,
  args: { taskId: any; employeeId: any },
) {
  await resolveActor(ctx);
  const task = await ctx.db.get(args.taskId as any);
  if (task) {
    await ctx.db.patch(task._id, { assigneeId: args.employeeId });
  }
  return null;
}

export const assignTask = mutation({
  args: {
    taskId: v.id('tasks'),
    employeeId: v.id('agents'),
  },
  returns: v.null(),
  handler: assignTaskHandler,
});

/**
 * Unassigns a task from an employee
 * @param ctx - Mutation context
 * @param args - Object containing taskId
 * @returns null
 */
export async function unassignTaskHandler(ctx: MutationCtx, args: { taskId: any }) {
  await resolveActor(ctx);
  const task = await ctx.db.get(args.taskId as any);
  if (task) {
    await ctx.db.patch(task._id, { assigneeId: undefined });
  }
  return null;
}

export const unassignTask = mutation({
  args: { taskId: v.id('tasks') },
  returns: v.null(),
  handler: unassignTaskHandler,
});

/**
 * Retrieves current workload for an employee
 * @param ctx - Query context
 * @param args - Object containing employeeId
 * @returns Number of tasks assigned to the employee
 */
export async function getEmployeeWorkloadHandler(ctx: QueryCtx, args: { employeeId: any }) {
  await resolveActor(ctx);
  const docs = await ctx.db.query('tasks').collect();
  return docs.filter((t) => t.assigneeId === args.employeeId).length;
}

export const getEmployeeWorkload = query({
  args: { employeeId: v.id('employees') },
  returns: v.number(),
  handler: getEmployeeWorkloadHandler,
});
