import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { abTestStatus, abTestVariant, agentRole, sprintStatus, trackStatus } from '../lib/validators';

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
    controlTemperature: v.optional(v.number()),
    treatmentTemperature: v.optional(v.number()),
    controlSystemPrompt: v.optional(v.string()),
    treatmentSystemPrompt: v.optional(v.string()),
    controlSkills: v.optional(v.array(v.string())),
    treatmentSkills: v.optional(v.array(v.string())),
    splitRatio: v.number(),
    status: abTestStatus,
    sprintId: v.optional(v.id('sprints')),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_status', ['status'])
    .index('by_sprint', ['sprintId']),

  experimentRuns: defineTable({
    experimentId: v.id('abTests'),
    variant: abTestVariant,
    taskDescription: v.string(),
    model: v.string(),
    agentRole: agentRole,
    cost: v.number(),
    durationMs: v.number(),
    output: v.string(),
    rejected: v.boolean(),
    similarityScore: v.optional(v.number()),
    startedAt: v.number(),
    completedAt: v.number(),
  })
    .index('by_experiment', ['experimentId'])
    .index('by_experiment_and_variant', ['experimentId', 'variant']),
};
