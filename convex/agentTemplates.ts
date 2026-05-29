import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { agentRole, supportedModels } from './lib/validators';

export const listTemplatesHandler = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('agentTemplates'),
      name: v.string(),
      role: v.string(),
      model: v.string(),
      temperature: v.number(),
      systemPrompt: v.string(),
      skills: v.array(v.string()),
      estimatedCostPer1kTokens: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const docs = await ctx.db.query('agentTemplates').order('desc').collect();
    return docs.map((doc) => {
      const { _creationTime, ...rest } = doc as any;
      return rest;
    });
  },
});

export const getTemplateHandler = query({
  args: { id: v.id('agentTemplates') },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('agentTemplates'),
      name: v.string(),
      role: v.string(),
      model: v.string(),
      temperature: v.number(),
      systemPrompt: v.string(),
      skills: v.array(v.string()),
      estimatedCostPer1kTokens: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    const { _creationTime, ...rest } = doc as any;
    return rest;
  },
});

export const getTemplateByNameHandler = query({
  args: { name: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('agentTemplates'),
      name: v.string(),
      role: v.string(),
      model: v.string(),
      temperature: v.number(),
      systemPrompt: v.string(),
      skills: v.array(v.string()),
      estimatedCostPer1kTokens: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query('agentTemplates')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .unique();
    if (!doc) return null;
    const { _creationTime, ...rest } = doc as any;
    return rest;
  },
});

export const createTemplateHandler = mutation({
  args: {
    name: v.string(),
    role: agentRole,
    model: supportedModels,
    temperature: v.number(),
    systemPrompt: v.string(),
    skills: v.array(v.string()),
    estimatedCostPer1kTokens: v.number(),
  },
  returns: v.id('agentTemplates'),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('agentTemplates')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .unique();
    if (existing) {
      throw new Error(`Template with name "${args.name}" already exists`);
    }
    const now = Date.now();
    return ctx.db.insert('agentTemplates', {
      name: args.name,
      role: args.role,
      model: args.model,
      temperature: args.temperature,
      systemPrompt: args.systemPrompt,
      skills: args.skills,
      estimatedCostPer1kTokens: args.estimatedCostPer1kTokens,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateTemplateHandler = mutation({
  args: {
    id: v.id('agentTemplates'),
    name: v.optional(v.string()),
    role: v.optional(agentRole),
    model: v.optional(supportedModels),
    temperature: v.optional(v.number()),
    systemPrompt: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    estimatedCostPer1kTokens: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) {
      const existing = await ctx.db
        .query('agentTemplates')
        .withIndex('by_name', (q) => q.eq('name', args.name!))
        .unique();
      if (existing && existing._id !== args.id) {
        throw new Error(`Template with name "${args.name}" already exists`);
      }
      patch.name = args.name;
    }
    if (args.role !== undefined) patch.role = args.role;
    if (args.model !== undefined) patch.model = args.model;
    if (args.temperature !== undefined) patch.temperature = args.temperature;
    if (args.systemPrompt !== undefined) patch.systemPrompt = args.systemPrompt;
    if (args.skills !== undefined) patch.skills = args.skills;
    if (args.estimatedCostPer1kTokens !== undefined)
      patch.estimatedCostPer1kTokens = args.estimatedCostPer1kTokens;
    await ctx.db.patch(args.id, patch);
    return null;
  },
});

export const deleteTemplateHandler = mutation({
  args: { id: v.id('agentTemplates') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const agentsUsingTemplate = await ctx.db
      .query('agents')
      .withIndex('by_templateId', (q) => q.eq('templateId', args.id))
      .collect();
    if (agentsUsingTemplate.length > 0) {
      throw new Error('Cannot delete template: it is assigned to one or more agents');
    }
    await ctx.db.delete(args.id);
    return null;
  },
});

export const cloneTemplateHandler = mutation({
  args: {
    id: v.id('agentTemplates'),
    newName: v.string(),
  },
  returns: v.id('agentTemplates'),
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.id);
    if (!source) throw new Error('Source template not found');
    const existing = await ctx.db
      .query('agentTemplates')
      .withIndex('by_name', (q) => q.eq('name', args.newName))
      .unique();
    if (existing) {
      throw new Error(`Template with name "${args.newName}" already exists`);
    }
    const now = Date.now();
    const { _creationTime, _id, ...fields } = source as any;
    return ctx.db.insert('agentTemplates', {
      ...fields,
      name: args.newName,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const seedDefaultTemplatesHandler = mutation({
  args: {},
  returns: v.array(v.id('agentTemplates')),
  handler: async (ctx) => {
    const existing = await ctx.db.query('agentTemplates').collect();
    const existingNames = new Set(existing.map((t) => t.name));

    const defaults = [
      {
        name: 'alice',
        role: 'architect' as const,
        model: 'claude-opus' as const,
        temperature: 0.3,
        systemPrompt:
          'You are a senior software architect. Decompose specs into implementation plans with clear task boundaries.',
        skills: ['react', 'typescript', 'ui-design', 'system-design'],
        estimatedCostPer1kTokens: 0.015,
      },
      {
        name: 'bob',
        role: 'executor' as const,
        model: 'claude-sonnet' as const,
        temperature: 0.2,
        systemPrompt:
          'You are a backend engineer. Write clean, tested TypeScript code following existing patterns.',
        skills: ['node', 'postgresql', 'api-design', 'typescript'],
        estimatedCostPer1kTokens: 0.003,
      },
      {
        name: 'carol',
        role: 'reviewer' as const,
        model: 'gpt-4o' as const,
        temperature: 0.1,
        systemPrompt:
          'You are a code reviewer. Check for correctness, test coverage, and adherence to spec acceptance criteria.',
        skills: ['testing', 'playwright', 'ci-cd', 'code-review'],
        estimatedCostPer1kTokens: 0.005,
      },
      {
        name: 'frank',
        role: 'executor' as const,
        model: 'gemini-pro' as const,
        temperature: 0.4,
        systemPrompt:
          'You are a technical writer. Produce clear documentation, READMEs, and inline comments.',
        skills: ['documentation', 'technical-writing', 'markdown'],
        estimatedCostPer1kTokens: 0.001,
      },
    ];

    const missing = defaults.filter((t) => !existingNames.has(t.name));
    const now = Date.now();
    const ids = await Promise.all(
      missing.map((t) =>
        ctx.db.insert('agentTemplates', {
          name: t.name,
          role: t.role,
          model: t.model,
          temperature: t.temperature,
          systemPrompt: t.systemPrompt,
          skills: t.skills,
          estimatedCostPer1kTokens: t.estimatedCostPer1kTokens,
          createdAt: now,
          updatedAt: now,
        }),
      ),
    );

    return ids;
  },
});