import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { sprintStatus, trackStatus } from '../lib/validators';

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

};
