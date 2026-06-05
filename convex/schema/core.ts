import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { boardStatus, priority, routingPolicy, taskStatus } from '../lib/validators';

export default {
  systemMetadata: defineTable({
    key: v.string(),
    valueJson: v.string(),
    updatedAt: v.number(),
  })
    .index('by_key', ['key']),

  settings: defineTable({
    scope: v.string(),
    key: v.string(),
    valueJson: v.string(),
    updatedAt: v.number(),
  })
    .index('by_scope', ['scope'])
    .index('by_scope_and_key', ['scope', 'key']),

  projects: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    path: v.optional(v.string()),
    modelRoutingPolicy: v.optional(routingPolicy),
    templateId: v.optional(v.string()),
    estimatedBudget: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_name', ['name'])
    .index('by_slug', ['slug'])
    .index('by_templateId', ['templateId']),

  boards: defineTable({
    projectId: v.id('projects'),
    name: v.string(),
    status: boardStatus,
    createdAt: v.number(),
  })
    .index('by_project', ['projectId']),

  columns: defineTable({
    boardId: v.id('boards'),
    name: v.string(),
    order: v.number(),
    createdAt: v.number(),
  })
    .index('by_board', ['boardId']),

  projectTemplates: defineTable({
    name: v.string(),
    description: v.string(),
    category: v.string(),
    tasks: v.array(
      v.object({
        title: v.string(),
        storyPoints: v.number(),
        priority: priority,
        status: taskStatus,
        dependencies: v.optional(v.array(v.string())),
      }),
    ),
    defaultAgents: v.array(
      v.object({
        role: v.union(
          v.literal('architect'),
          v.literal('executor'),
          v.literal('reviewer'),
          v.literal('merger'),
        ),
        model: v.string(),
        skills: v.array(v.string()),
        costPerPoint: v.number(),
      }),
    ),
    estimatedBudget: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_name', ['name'])
    .index('by_category', ['category']),
};
