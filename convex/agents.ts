import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';

export const listAgentsHandler = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('agents'),
      name: v.string(),
      role: v.string(),
      skills: v.array(v.string()),
      model: v.string(),
      costPerPoint: v.number(),
      reliability: v.number(),
      status: v.string(),
      workload: v.number(),
      maxWorkload: v.number(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    await resolveActor(ctx);
    const docs = await ctx.db.query('agents').order('desc').collect();
    return docs.map((doc) => {
      const { _creationTime, ...rest } = doc as any;
      return rest;
    });
  },
});

export const getAgentHandler = query({
  args: { id: v.id('agents') },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('agents'),
      name: v.string(),
      role: v.string(),
      skills: v.array(v.string()),
      model: v.string(),
      costPerPoint: v.number(),
      reliability: v.number(),
      status: v.string(),
      workload: v.number(),
      maxWorkload: v.number(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    const { _creationTime, ...rest } = doc as any;
    return rest;
  },
});

export const createAgentHandler = mutation({
  args: {
    name: v.string(),
    role: v.string(),
    skills: v.array(v.string()),
    model: v.string(),
    costPerPoint: v.number(),
    reliability: v.number(),
    maxWorkload: v.number(),
  },
  returns: v.id('agents'),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    return ctx.db.insert('agents', {
      name: args.name,
      role: args.role as any,
      skills: args.skills,
      model: args.model,
      costPerPoint: args.costPerPoint,
      reliability: args.reliability,
      status: 'active',
      workload: 0,
      maxWorkload: args.maxWorkload,
      createdAt: Date.now(),
    });
  },
});

export const updateAgentHandler = mutation({
  args: {
    id: v.id('agents'),
    costPerPoint: v.optional(v.number()),
    maxWorkload: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const patch: Record<string, unknown> = {};
    if (args.costPerPoint !== undefined) patch.costPerPoint = args.costPerPoint;
    if (args.maxWorkload !== undefined) patch.maxWorkload = args.maxWorkload;
    await ctx.db.patch(args.id, patch);
    return null;
  },
});

export const updateAgentStatusHandler = mutation({
  args: {
    id: v.id('agents'),
    status: v.union(
      v.literal('active'),
      v.literal('idle'),
      v.literal('blocked'),
      v.literal('offline'),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    await ctx.db.patch(args.id, { status: args.status });
    return null;
  },
});

export const seedAgentsHandler = mutation({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('agents'),
      name: v.string(),
      role: v.string(),
      skills: v.array(v.string()),
      model: v.string(),
      costPerPoint: v.number(),
      reliability: v.number(),
      status: v.string(),
      workload: v.number(),
      maxWorkload: v.number(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    await resolveActor(ctx);
    const existing = await ctx.db.query('agents').collect();
    const existingNames = new Set(existing.map((a) => a.name));

    const defaults = [
      {
        name: 'alice',
        role: 'architect' as const,
        skills: ['react', 'typescript', 'ui-design'],
        model: 'claude-opus',
        costPerPoint: 4.2,
        reliability: 0.95,
        status: 'active' as const,
        workload: 0,
        maxWorkload: 5,
        createdAt: Date.now(),
      },
      {
        name: 'bob',
        role: 'executor' as const,
        skills: ['node', 'postgresql', 'api-design'],
        model: 'claude-sonnet',
        costPerPoint: 2.1,
        reliability: 0.92,
        status: 'active' as const,
        workload: 0,
        maxWorkload: 5,
        createdAt: Date.now(),
      },
      {
        name: 'carol',
        role: 'reviewer' as const,
        skills: ['testing', 'playwright', 'ci-cd'],
        model: 'gpt-4o',
        costPerPoint: 1.8,
        reliability: 0.88,
        status: 'active' as const,
        workload: 0,
        maxWorkload: 5,
        createdAt: Date.now(),
      },
      {
        name: 'frank',
        role: 'executor' as const,
        skills: ['documentation', 'technical-writing', 'markdown'],
        model: 'gemini-pro',
        costPerPoint: 1.2,
        reliability: 0.85,
        status: 'active' as const,
        workload: 0,
        maxWorkload: 5,
        createdAt: Date.now(),
      },
    ];

    const missing = defaults.filter((a) => !existingNames.has(a.name));

    const ids = await Promise.all(
      missing.map((a) =>
        ctx.db.insert('agents', {
          name: a.name,
          role: a.role,
          skills: a.skills,
          model: a.model,
          costPerPoint: a.costPerPoint,
          reliability: a.reliability,
          status: a.status,
          workload: a.workload,
          maxWorkload: a.maxWorkload,
          createdAt: a.createdAt,
        })
      )
    );

    const allAgents = await ctx.db.query('agents').collect();
    return allAgents.map((doc) => {
      const { _creationTime, ...rest } = doc as any;
      return rest;
    });
  },
});

export const calculateCostPerPointHandler = query({
  args: { agentId: v.id('agents') },
  returns: v.number(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const tasks = await ctx.db.query('tasks').collect();
    const completed = tasks.filter(
      (t) =>
        t.assigneeId === args.agentId &&
        t.status === 'done' &&
        t.storyPoints > 0
    );

    if (completed.length === 0) return 0;

    const totalActualCost = completed.reduce(
      (sum, t) => sum + (t.actualCost ?? 0),
      0
    );
    const totalPoints = completed.reduce(
      (sum, t) => sum + t.storyPoints,
      0
    );

    if (totalPoints === 0) return 0;
    return totalActualCost / totalPoints;
  },
});
