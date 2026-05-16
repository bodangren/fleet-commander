import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { QueryCtx, MutationCtx } from './_generated/server';

const employeeResponse = v.object({
  _id: v.id('employees'),
  name: v.string(),
  role: v.string(),
  skills: v.array(v.string()),
  model: v.string(),
  status: v.union(v.literal('active'), v.literal('away')),
  createdAt: v.number(),
});

export async function listEmployeesHandler(ctx: QueryCtx) {
  const docs = await ctx.db.query('employees').order('desc').collect();
  return docs;
}

export const listEmployees = query({
  args: {},
  returns: v.array(employeeResponse),
  handler: listEmployeesHandler,
});

export async function getEmployeeHandler(ctx: QueryCtx, args: { id: string }) {
  const doc = await ctx.db.get(args.id as any);
  if (!doc) return null;
  return doc;
}

export const getEmployee = query({
  args: { id: v.string() },
  returns: v.union(employeeResponse, v.null()),
  handler: getEmployeeHandler,
});

export async function createEmployeeHandler(
  ctx: MutationCtx,
  args: {
    name: string;
    role: string;
    skills: string[];
    model: string;
  },
) {
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

export async function updateEmployeeStatusHandler(
  ctx: MutationCtx,
  args: { id: string; status: 'active' | 'away' },
) {
  await ctx.db.patch(args.id as any, { status: args.status });
  return null;
}

export const updateEmployeeStatus = mutation({
  args: {
    id: v.string(),
    status: v.union(v.literal('active'), v.literal('away')),
  },
  returns: v.null(),
  handler: updateEmployeeStatusHandler,
});

export async function assignTaskHandler(
  ctx: MutationCtx,
  args: { taskId: string; employeeId: string },
) {
  await ctx.db.patch(args.taskId as any, { assignee: args.employeeId });
  return null;
}

export const assignTask = mutation({
  args: {
    taskId: v.string(),
    employeeId: v.string(),
  },
  returns: v.null(),
  handler: assignTaskHandler,
});

export async function unassignTaskHandler(ctx: MutationCtx, args: { taskId: string }) {
  await ctx.db.patch(args.taskId as any, { assignee: undefined });
  return null;
}

export const unassignTask = mutation({
  args: { taskId: v.string() },
  returns: v.null(),
  handler: unassignTaskHandler,
});

export async function getEmployeeWorkloadHandler(ctx: QueryCtx, _args: { employeeId: string }) {
  const docs = await ctx.db
    .query('tasks')
    .withIndex('by_assignee', (q) => q.eq('assignee', _args.employeeId as any))
    .collect();
  return docs.length;
}

export const getEmployeeWorkload = query({
  args: { employeeId: v.string() },
  returns: v.number(),
  handler: getEmployeeWorkloadHandler,
});
