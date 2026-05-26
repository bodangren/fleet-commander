import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { trackStatus, sprintStatus, agentRole, abTestStatus } from '../lib/validators';

export default {
  tracks: defineTable({
    projectSlug: v.string(),
    projectId: v.optional(v.id('projects')),
    trackId: v.string(),
    title: v.string(),
    status: trackStatus,
    specMarkdown: v.string(),
    planMarkdown: v.string(),
    version: v.number(),
    updatedAt: v.number(),
  })
    .index('by_project', ['projectSlug'])
    .index('by_project_id', ['projectId'])
    .index('by_project_and_track', ['projectSlug', 'trackId'])
    .index('by_status', ['status']),

  sprints: defineTable({
    projectId: v.id('projects'),
    name: v.string(),
    status: sprintStatus,
    budget: v.number(),
    actualCost: v.number(),
    pointsDelivered: v.number(),
    taskCount: v.number(),
    completedCount: v.number(),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    closedAt: v.optional(v.number()),
  })
    .index('by_project', ['projectId']),

  abTests: defineTable({
    name: v.string(),
    agentRole: agentRole,
    controlModel: v.string(),
    treatmentModel: v.string(),
    splitRatio: v.number(),
    status: abTestStatus,
    sprintId: v.optional(v.id('sprints')),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_status', ['status'])
    .index('by_sprint', ['sprintId']),
};
