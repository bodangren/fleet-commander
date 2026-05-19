import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { taskStatus } from './lib/validators';

const boardTask = v.object({
  _id: v.id('tasks'),
  projectId: v.id('projects'),
  sprintId: v.optional(v.id('sprints')),
  title: v.string(),
  description: v.string(),
  storyPoints: v.number(),
  status: taskStatus,
  priority: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
  costEstimate: v.number(),
  actualCost: v.optional(v.number()),
  assigneeId: v.optional(v.id('agents')),
  reviewerId: v.optional(v.id('agents')),
  mergerId: v.optional(v.id('agents')),
  createdAt: v.number(),
  updatedAt: v.number(),
  assigneeName: v.optional(v.string()),
  assigneeRole: v.optional(v.string()),
});

export const getSprintBoardHandler = query({
  args: { sprintId: v.id('sprints') },
  returns: v.object({
    sprint: v.object({
      _id: v.id('sprints'),
      projectId: v.id('projects'),
      name: v.string(),
      status: v.string(),
      budget: v.number(),
      actualCost: v.number(),
      pointsDelivered: v.number(),
      taskCount: v.number(),
      completedCount: v.number(),
      createdAt: v.number(),
      startedAt: v.optional(v.number()),
      closedAt: v.optional(v.number()),
    }),
    tasks: v.array(boardTask),
    agents: v.array(
      v.object({
        _id: v.id('agents'),
        name: v.string(),
        role: v.string(),
        status: v.string(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const sprint = await ctx.db.get(args.sprintId);
    if (!sprint) throw new Error('Sprint not found');

    const tasks = await ctx.db
      .query('tasks')
      .withIndex('by_sprint', (q) => q.eq('sprintId', args.sprintId))
      .collect();

    const agentIds = new Set<string>();
    for (const t of tasks) {
      if (t.assigneeId) agentIds.add(t.assigneeId);
      if (t.reviewerId) agentIds.add(t.reviewerId);
      if (t.mergerId) agentIds.add(t.mergerId);
    }

    const agents = await Promise.all(
      Array.from(agentIds).map((id) => ctx.db.get(id as any)),
    );

    const agentMap = new Map<string, { name: string; role: string; status: string }>();
    for (const a of agents) {
      if (a) {
        agentMap.set(a._id, {
          name: a.name as string,
          role: a.role as string,
          status: a.status as string,
        });
      }
    }

    const tasksWithAgents = tasks.map((t) => {
      const assignee = t.assigneeId ? agentMap.get(t.assigneeId) : undefined;
      const { _creationTime, ...rest } = t as any;
      return {
        ...rest,
        assigneeName: assignee?.name,
        assigneeRole: assignee?.role,
      };
    });

    const { _creationTime: _sprintCt, ...sprintRest } = sprint as any;

    return {
      sprint: sprintRest,
      tasks: tasksWithAgents,
      agents: agents
        .filter((a): a is NonNullable<typeof a> => a !== null)
        .map((a) => {
          const { _creationTime, ...r } = a as any;
          return { _id: r._id, name: r.name, role: r.role, status: r.status };
        }),
    };
  },
});

export const getActiveSprintHandler = query({
  args: { projectId: v.id('projects') },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('sprints'),
      projectId: v.id('projects'),
      name: v.string(),
      status: v.string(),
      budget: v.number(),
      actualCost: v.number(),
      pointsDelivered: v.number(),
      taskCount: v.number(),
      completedCount: v.number(),
      createdAt: v.number(),
      startedAt: v.optional(v.number()),
      closedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const sprints = await ctx.db
      .query('sprints')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();

    const active = sprints.find((s) => s.status === 'active');
    if (!active) return null;

    const { _creationTime, ...rest } = active as any;
    return rest;
  },
});

export const getSprintsByProjectHandler = query({
  args: { projectId: v.id('projects') },
  returns: v.array(
    v.object({
      _id: v.id('sprints'),
      projectId: v.id('projects'),
      name: v.string(),
      status: v.string(),
      budget: v.number(),
      actualCost: v.number(),
      pointsDelivered: v.number(),
      taskCount: v.number(),
      completedCount: v.number(),
      createdAt: v.number(),
      startedAt: v.optional(v.number()),
      closedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query('sprints')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .collect();

    return docs.map((doc) => {
      const { _creationTime, ...rest } = doc as any;
      return rest;
    });
  },
});
