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
  return [] as any[];
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
  _ctx: MutationCtx,
  _args: {
    name: string;
    role: string;
    skills: string[];
    model: string;
  },
) {
  return '' as any;
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
  _ctx: MutationCtx,
  _args: { id: string; status: 'active' | 'away' },
) {
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
  _ctx: MutationCtx,
  _args: { taskId: string; employeeId: string },
) {
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

export async function unassignTaskHandler(_ctx: MutationCtx, _args: { taskId: string }) {
  return null;
}

export const unassignTask = mutation({
  args: { taskId: v.string() },
  returns: v.null(),
  handler: unassignTaskHandler,
});

export async function getEmployeeWorkloadHandler(_ctx: QueryCtx, _args: { employeeId: string }) {
  return 0;
}

export const getEmployeeWorkload = query({
  args: { employeeId: v.string() },
  returns: v.number(),
  handler: getEmployeeWorkloadHandler,
});
