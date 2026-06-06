import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { analysisSeverity, budgetPolicy, governanceEventType, scoreAuditOutcome } from '../lib/validators';

export default {
  costRecords: defineTable({
    agentId: v.string(),
    projectSlug: v.string(),
    sprintId: v.optional(v.string()),
    taskId: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    costUSD: v.number(),
    sessionResumed: v.boolean(),
    sessionCostSaved: v.number(),
    recordedAt: v.number(),
  })
    .index('by_project', ['projectSlug'])
    .index('by_agent', ['agentId'])
    .index('by_task', ['taskId'])
    .index('by_recorded_at', ['recordedAt'])
    .index('by_project_and_recorded_at', ['projectSlug', 'recordedAt']),

  budgets: defineTable({
    scope: v.string(),
    periodStart: v.number(),
    periodEnd: v.number(),
    cap: v.number(),
    spent: v.number(),
    policy: budgetPolicy,
    updatedAt: v.number(),
  })
    .index('by_scope', ['scope']),

  governanceEvents: defineTable({
    scope: v.string(),
    eventType: governanceEventType,
    payloadJson: v.string(),
    createdAt: v.number(),
  })
    .index('by_scope', ['scope'])
    .index('by_created_at', ['createdAt'])
    .index('by_scope_and_eventType_and_createdAt', ['scope', 'eventType', 'createdAt'])
    .index('by_eventType_and_createdAt', ['eventType', 'createdAt'])
    .index('by_scope_and_createdAt', ['scope', 'createdAt']),

  performanceBaselines: defineTable({
    projectSlug: v.string(),
    agent: v.string(),
    taskKind: v.string(),
    baselineDate: v.string(),
    avgDurationMs: v.number(),
    p50DurationMs: v.number(),
    p95DurationMs: v.number(),
    sampleCount: v.number(),
    windowDays: v.number(),
    createdAt: v.number(),
  })
    .index('by_project_and_agent', ['projectSlug', 'agent'])
    .index('by_agent_project_and_taskKind', ['agent', 'projectSlug', 'taskKind'])
    .index('by_baseline_date', ['baselineDate']),

  analysisResults: defineTable({
    projectSlug: v.string(),
    executionId: v.string(),
    tool: v.string(),
    file: v.string(),
    line: v.optional(v.number()),
    column: v.optional(v.number()),
    severity: analysisSeverity,
    message: v.string(),
    rule: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_project', ['projectSlug'])
    .index('by_execution', ['executionId'])
    .index('by_project_and_execution', ['projectSlug', 'executionId'])
    .index('by_severity', ['severity']),

  simulationRuns: defineTable({
    windowDays: v.number(),
    candidateWeightsJson: v.string(),
    candidateRulesJson: v.string(),
    reportJson: v.string(),
    createdAt: v.number(),
  })
    .index('by_created_at', ['createdAt']),

  coverageRecords: defineTable({
    projectSlug: v.string(),
    projectId: v.string(),
    percentage: v.number(),
    tool: v.string(),
    executionId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_project', ['projectSlug'])
    .index('by_project_and_date', ['projectSlug', 'createdAt']),

  scoreAudit: defineTable({
    dispatchedAt: v.number(),
    chosenTaskId: v.string(),
    candidatesJson: v.string(),
    breakdownJson: v.string(),
    justification: v.string(),
    weightsVersion: v.number(),
    llmTieBreak: v.boolean(),
    outcome: v.optional(scoreAuditOutcome),
    outcomeRecordedAt: v.optional(v.number()),
  })
    .index('by_task', ['chosenTaskId'])
    .index('by_dispatched_at', ['dispatchedAt']),
};
