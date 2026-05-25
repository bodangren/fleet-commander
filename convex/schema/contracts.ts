import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export default {
  runContracts: defineTable({
    taskId: v.string(),
    projectSlug: v.string(),
    objective: v.string(),
    scope: v.array(v.string()),
    acceptanceCriteria: v.array(v.string()),
    createdAt: v.number(),
    harnessName: v.optional(v.string()),
    maxExecutionMs: v.optional(v.number()),
    maxTokens: v.optional(v.number()),
    architectOutput: v.optional(v.string()),
    architectConfidence: v.optional(v.number()),
    architectAssumptions: v.optional(v.array(v.string())),
    executorChangedFiles: v.optional(v.array(v.string())),
    executorTestsRun: v.optional(v.array(v.string())),
    executorUnresolvedAssumptions: v.optional(v.array(v.string())),
    executorConfidence: v.optional(v.number()),
    executorBranch: v.optional(v.string()),
    executorCommit: v.optional(v.string()),
    executorStatus: v.optional(v.union(v.literal('succeeded'), v.literal('failed'))),
    reviewerStatus: v.optional(v.union(v.literal('passed'), v.literal('failed'), v.literal('needs-changes'))),
    reviewerSummary: v.optional(v.string()),
    reviewerIssueClass: v.optional(v.union(v.literal('correctness'), v.literal('security'), v.literal('performance'), v.literal('style'), v.literal('spec_mismatch'))),
    reviewerSeverity: v.optional(v.union(v.literal('blocker'), v.literal('major'), v.literal('minor'))),
    reviewerResolvedAssumptions: v.optional(v.boolean()),
    recoveryAction: v.optional(v.union(v.literal('retry'), v.literal('escalate'), v.literal('split'), v.literal('replan'), v.literal('human_review'))),
    recoveryReason: v.optional(v.string()),
    dispatchRejections: v.optional(v.array(v.object({
      taskKey: v.string(),
      filter: v.string(),
      reason: v.string(),
    }))),
    sessionId: v.optional(v.string()),
    estimatedCost: v.optional(v.number()),
    actualCost: v.optional(v.number()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
  })
    .index('by_task', ['taskId'])
    .index('by_created_at', ['createdAt'])
    .index('by_project', ['projectSlug']),

  policyWeights: defineTable({
    name: v.string(),
    weightsJson: v.string(),
    version: v.number(),
    createdAt: v.number(),
  })
    .index('by_name', ['name'])
    .index('by_version', ['name', 'version']),

  retrospectives: defineTable({
    sprintId: v.optional(v.string()),
    projectSlug: v.optional(v.string()),
    name: v.string(),
    status: v.union(
      v.literal('pending'),
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed'),
    ),
    triggeredBy: v.union(v.literal('manual'), v.literal('scheduled')),
    reportMarkdown: v.optional(v.string()),
    aggregatedDataJson: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_project', ['projectSlug'])
    .index('by_sprint', ['sprintId'])
    .index('by_status', ['status']),

  orchestratorErrors: defineTable({
    projectSlug: v.optional(v.string()),
    taskKey: v.optional(v.string()),
    agentId: v.optional(v.string()),
    operation: v.string(),
    severity: v.union(v.literal('fatal'), v.literal('warning'), v.literal('debug')),
    message: v.string(),
    errorStack: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_project', ['projectSlug'])
    .index('by_created_at', ['createdAt'])
    .index('by_severity', ['severity'])
    .index('by_task', ['taskKey'])
    .index('by_agent', ['agentId']),
};
