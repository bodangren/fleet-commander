import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { taskStatus, priority } from './lib/validators';

const taskResponse = v.object({
  _id: v.id('tasks'),
  projectId: v.id('projects'),
  sprintId: v.optional(v.id('sprints')),
  title: v.string(),
  description: v.string(),
  storyPoints: v.number(),
  status: taskStatus,
  priority: priority,
  costEstimate: v.number(),
  actualCost: v.optional(v.number()),
  assigneeId: v.optional(v.id('agents')),
  reviewerId: v.optional(v.id('agents')),
  mergerId: v.optional(v.id('agents')),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const listTasksHandler = query({
  args: { projectId: v.id('projects') },
  returns: v.array(taskResponse),
  handler: async (ctx, args) => {
    throw new Error('Not implemented');
  },
});

export const getTaskHandler = query({
  args: { id: v.id('tasks') },
  returns: v.union(v.null(), taskResponse),
  handler: async (ctx, args) => {
    throw new Error('Not implemented');
  },
});

export const createTaskHandler = mutation({
  args: {
    projectId: v.id('projects'),
    sprintId: v.optional(v.id('sprints')),
    title: v.string(),
    description: v.string(),
    storyPoints: v.number(),
    priority: priority,
    assigneeId: v.optional(v.id('agents')),
  },
  returns: v.id('tasks'),
  handler: async (ctx, args) => {
    throw new Error('Not implemented');
  },
});

export const updateTaskHandler = mutation({
  args: {
    id: v.id('tasks'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    storyPoints: v.optional(v.number()),
    priority: v.optional(priority),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    throw new Error('Not implemented');
  },
});

export const updateTaskStatusHandler = mutation({
  args: {
    id: v.id('tasks'),
    status: taskStatus,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    throw new Error('Not implemented');
  },
});

export const assignTaskHandler = mutation({
  args: {
    taskId: v.id('tasks'),
    agentId: v.id('agents'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    throw new Error('Not implemented');
  },
});

export const moveTaskHandler = mutation({
  args: {
    taskId: v.id('tasks'),
    sprintId: v.id('sprints'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    throw new Error('Not implemented');
  },
});
