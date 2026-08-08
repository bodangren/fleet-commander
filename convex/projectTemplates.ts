import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import {
  instantiateProjectFromTemplate,
  recommendBudget,
  type ProjectTemplate,
} from './lib/projectTemplates';
import { resolveActor } from './lib/auth';
import { agentRole, priority, taskStatus } from './lib/validators';

const taskShape = v.object({
  title: v.string(),
  storyPoints: v.number(),
  priority: priority,
  status: taskStatus,
  dependencies: v.optional(v.array(v.string())),
});

const agentShape = v.object({
  role: agentRole,
  model: v.string(),
  skills: v.array(v.string()),
  costPerPoint: v.number(),
});

const templateReturnShape = v.object({
  _id: v.id('projectTemplates'),
  name: v.string(),
  description: v.string(),
  category: v.string(),
  tasks: v.array(taskShape),
  defaultAgents: v.array(agentShape),
  estimatedBudget: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const listProjectTemplatesHandler = query({
  args: {},
  returns: v.array(templateReturnShape),
  handler: async (ctx) => {
    await resolveActor(ctx);
    const docs = await ctx.db.query('projectTemplates').order('desc').collect();
    return docs.map((doc) => {
      const { _creationTime, ...rest } = doc as any;
      return rest;
    });
  },
});

export const getProjectTemplateHandler = query({
  args: { id: v.id('projectTemplates') },
  returns: v.union(v.null(), templateReturnShape),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    const { _creationTime, ...rest } = doc as any;
    return rest;
  },
});

export const createProjectTemplateHandler = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    category: v.string(),
    tasks: v.array(taskShape),
    defaultAgents: v.array(agentShape),
    estimatedBudget: v.number(),
  },
  returns: v.id('projectTemplates'),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('projectTemplates')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .unique();
    if (existing) {
      throw new Error(`Template with name "${args.name}" already exists`);
    }
    const now = Date.now();
    return ctx.db.insert('projectTemplates', {
      name: args.name,
      description: args.description,
      category: args.category,
      tasks: args.tasks,
      defaultAgents: args.defaultAgents,
      estimatedBudget: args.estimatedBudget,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteProjectTemplateHandler = mutation({
  args: { id: v.id('projectTemplates') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const projectsUsingTemplate = await ctx.db
      .query('projects')
      .withIndex('by_templateId', (q) => q.eq('templateId', args.id))
      .collect();
    if (projectsUsingTemplate.length > 0) {
      throw new Error(
        'Cannot delete template: it has been used to instantiate one or more projects',
      );
    }
    await ctx.db.delete(args.id);
    return null;
  },
});

export const instantiateProjectHandler = mutation({
  args: {
    templateId: v.id('projectTemplates'),
    projectName: v.string(),
  },
  returns: v.object({
    projectId: v.id('projects'),
    taskIds: v.array(v.id('tasks')),
  }),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error('Project template not found');
    }

    const templateData: ProjectTemplate = {
      name: template.name,
      description: template.description,
      category: template.category,
      tasks: template.tasks,
      defaultAgents: template.defaultAgents,
      estimatedBudget: template.estimatedBudget,
    };

    const instantiated = instantiateProjectFromTemplate(templateData, args.projectName);
    const now = Date.now();

    const projectId = await ctx.db.insert('projects', {
      name: instantiated.project.name,
      slug: instantiated.project.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      description: instantiated.project.description,
      templateId: args.templateId,
      estimatedBudget: instantiated.recommendedBudget,
      createdAt: now,
      updatedAt: now,
    });

    const taskIds: Id<'tasks'>[] = [];
    for (const task of instantiated.tasks) {
      const taskId = await ctx.db.insert('tasks', {
        title: task.title,
        description: '',
        storyPoints: task.storyPoints,
        priority: task.priority,
        status: task.status,
        projectId,
        costEstimate: 0,
        createdAt: now,
        updatedAt: now,
        ...(task.dependencies ? { dependencies: task.dependencies } : {}),
      });
      taskIds.push(taskId);
    }

    for (const agent of templateData.defaultAgents) {
      await ctx.db.insert('agents', {
        name: `${agent.role}-${args.projectName}`,
        role: agent.role,
        skills: agent.skills,
        model: agent.model,
        costPerPoint: agent.costPerPoint,
        reliability: 1.0,
        status: 'active',
        workload: 0,
        maxWorkload: 5,
        createdAt: now,
      });
    }

    return { projectId, taskIds };
  },
});

const builtInTemplates = [
  {
    name: 'Web App (Next.js)',
    description: 'A starter Next.js web application with auth, routing, and database',
    category: 'Web App',
    tasks: [
      { title: 'Set up Next.js project', storyPoints: 2, priority: 'high' as const, status: 'backlog' as const },
      { title: 'Configure database', storyPoints: 5, priority: 'high' as const, status: 'backlog' as const, dependencies: ['Set up Next.js project'] },
      { title: 'Add authentication', storyPoints: 8, priority: 'medium' as const, status: 'backlog' as const, dependencies: ['Configure database'] },
    ],
    defaultAgents: [
      { role: 'architect' as const, model: 'claude-opus' as const, skills: ['system-design', 'typescript'], costPerPoint: 4.2 },
      { role: 'executor' as const, model: 'claude-sonnet' as const, skills: ['typescript', 'next', 'api-design'], costPerPoint: 2.1 },
    ],
  },
  {
    name: 'API Service (Bun/Hono)',
    description: 'A lightweight REST API service using Bun runtime and Hono framework',
    category: 'API Service',
    tasks: [
      { title: 'Initialize Bun project with Hono', storyPoints: 2, priority: 'high' as const, status: 'backlog' as const },
      { title: 'Define API routes', storyPoints: 5, priority: 'medium' as const, status: 'backlog' as const },
      { title: 'Add request validation', storyPoints: 3, priority: 'medium' as const, status: 'backlog' as const },
    ],
    defaultAgents: [
      { role: 'architect' as const, model: 'claude-opus' as const, skills: ['api-design', 'typescript'], costPerPoint: 4.2 },
      { role: 'executor' as const, model: 'claude-sonnet' as const, skills: ['bun', 'hono', 'typescript'], costPerPoint: 2.1 },
    ],
  },
  {
    name: 'Python CLI',
    description: 'A command-line tool built with Python and Click',
    category: 'CLI',
    tasks: [
      { title: 'Set up Python project with Click', storyPoints: 2, priority: 'high' as const, status: 'backlog' as const },
      { title: 'Implement core commands', storyPoints: 5, priority: 'medium' as const, status: 'backlog' as const },
      { title: 'Add output formatting', storyPoints: 3, priority: 'low' as const, status: 'backlog' as const },
    ],
    defaultAgents: [
      { role: 'architect' as const, model: 'claude-opus' as const, skills: ['python', 'cli-design'], costPerPoint: 4.2 },
      { role: 'executor' as const, model: 'claude-sonnet' as const, skills: ['python', 'click', 'testing'], costPerPoint: 2.1 },
    ],
  },
  {
    name: 'Documentation Site',
    description: 'A documentation website with search and versioning',
    category: 'Documentation',
    tasks: [
      { title: 'Set up docs framework', storyPoints: 3, priority: 'high' as const, status: 'backlog' as const },
      { title: 'Write getting started guide', storyPoints: 5, priority: 'medium' as const, status: 'backlog' as const },
      { title: 'Add API reference section', storyPoints: 8, priority: 'medium' as const, status: 'backlog' as const },
    ],
    defaultAgents: [
      { role: 'architect' as const, model: 'claude-opus' as const, skills: ['technical-writing', 'information-architecture'], costPerPoint: 4.2 },
      { role: 'executor' as const, model: 'gemini-pro' as const, skills: ['documentation', 'markdown'], costPerPoint: 1.2 },
    ],
  },
];

export const seedDefaultProjectTemplatesHandler = mutation({
  args: {},
  returns: v.array(v.id('projectTemplates')),
  handler: async (ctx) => {
    await resolveActor(ctx);
    const existing = await ctx.db.query('projectTemplates').collect();
    const existingNames = new Set(existing.map((t) => t.name));
    const now = Date.now();

    const missing = builtInTemplates.filter((t) => !existingNames.has(t.name));
    const ids = await Promise.all(
      missing.map((t) => {
        const templateData: ProjectTemplate = {
          ...t,
          estimatedBudget: 0,
        };
        templateData.estimatedBudget = recommendBudget(templateData);

        return ctx.db.insert('projectTemplates', {
          name: t.name,
          description: t.description,
          category: t.category,
          tasks: t.tasks,
          defaultAgents: t.defaultAgents,
          estimatedBudget: templateData.estimatedBudget,
          createdAt: now,
          updatedAt: now,
        });
      }),
    );

    return ids;
  },
});
