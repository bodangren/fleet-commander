import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { boardStatus } from '../lib/validators';

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
    description: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_name', ['name']),

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
};
