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

export async function getEmployeeHandler(ctx: QueryCtx, args: { id: string }) {
  await resolveActor(ctx);
  const doc = await ctx.db.query('employees').filter((q) => q.eq(q.field('_id'), args.id as any)).first();
  if (!doc) return null;
  const { _creationTime, ...rest } = doc;
  return rest;
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

export async function updateEmployeeStatusHandler(
  ctx: MutationCtx,
  args: { id: string; status: 'active' | 'away' },
) {
  await resolveActor(ctx);
  const doc = await ctx.db.query('employees').filter((q) => q.eq(q.field('_id'), args.id as any)).first();
  if (doc) {
    await ctx.db.patch(doc._id, { status: args.status });
  }
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
  await resolveActor(ctx);
  const task = await ctx.db.query('tasks').filter((q) => q.eq(q.field('_id'), args.taskId as any)).first();
  if (task) {
    await ctx.db.patch(task._id, { assigneeId: args.employeeId as any });
  }
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
  await resolveActor(ctx);
  const task = await ctx.db.query('tasks').filter((q) => q.eq(q.field('_id'), args.taskId as any)).first();
  if (task) {
    await ctx.db.patch(task._id, { assigneeId: undefined });
  }
  return null;
}

export const unassignTask = mutation({
  args: { taskId: v.string() },
  returns: v.null(),
  handler: unassignTaskHandler,
});

export async function getEmployeeWorkloadHandler(ctx: QueryCtx, _args: { employeeId: string }) {
  await resolveActor(ctx);
  const docs = await ctx.db.query('tasks').collect();
  return docs.filter((t) => t.assigneeId === (_args.employeeId as any)).length;
}

export const getEmployeeWorkload = query({
  args: { employeeId: v.string() },
  returns: v.number(),
  handler: getEmployeeWorkloadHandler,
});
