import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { executorStatus, orchestratorErrorSeverity, recoveryAction, retrospectiveStatus, retrospectiveTriggeredBy, reviewerIssueClass, reviewerSeverity, reviewerStatus, routingPolicy } from '../lib/validators';

export default {
  qualityProfiles: defineTable({
    name: v.string(),
    version: v.number(),
    kind: v.union(v.literal('none'), v.literal('standard'), v.literal('strict')),
    description: v.string(),
    stages: v.array(v.any()),
    updatedAt: v.number(),
  })
    .index('by_name_version', ['name', 'version']),

  projectProfileSelections: defineTable({
    projectSlug: v.string(),
    profileName: v.string(),
    profileVersion: v.number(),
    actor: v.string(),
    createdAt: v.number(),
  })
    .index('by_project', ['projectSlug']),

  taskOverrides: defineTable({
    projectSlug: v.string(),
    taskKey: v.string(),
    profileName: v.string(),
    profileVersion: v.number(),
    reason: v.string(),
    actor: v.string(),
    createdAt: v.number(),
  })
    .index('by_project_task', ['projectSlug', 'taskKey']),

  runProfileSnapshots: defineTable({
    projectSlug: v.string(),
    taskKey: v.string(),
    runId: v.string(),
    profileName: v.string(),
    profileVersion: v.number(),
    profileSnapshot: v.optional(v.union(v.null(), v.record(v.string(), v.any()))),
    immutable: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_runId', ['runId']),

  qualityRuns: defineTable({
    projectSlug: v.string(),
    taskKey: v.string(),
    runId: v.string(),
    idempotencyKey: v.string(),
    profileName: v.string(),
    profileVersion: v.number(),
    profileSnapshot: v.union(v.null(), v.record(v.string(), v.any())),
    status: v.union(v.literal('running'), v.literal('passed'), v.literal('failed'), v.literal('blocked'), v.literal('cancelled')),
    createdAt: v.number(),
    finishedAt: v.optional(v.number()),
    reason: v.optional(v.string()),
  })
    .index('by_idempotency', ['idempotencyKey', 'projectSlug', 'taskKey'])
    .index('by_runId', ['runId'])
    .index('by_project_and_runId', ['projectSlug', 'runId']),

  qualityStageAttempts: defineTable({
    projectSlug: v.string(),
    runId: v.string(),
    stageKind: v.string(),
    role: v.string(),
    attempt: v.number(),
    status: v.string(),
    startedAt: v.number(),
    finishedAt: v.number(),
    evidence: v.union(v.null(), v.record(v.string(), v.any())),
    costUSD: v.number(),
    tokens: v.number(),
    model: v.union(v.null(), v.string()),
    reason: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_run', ['runId'])
    .index('by_run_stage', ['runId', 'stageKind'])
    .index('by_project_and_run', ['projectSlug', 'runId']),

  runContracts: defineTable({
    taskId: v.string(),
    projectSlug: v.string(),
    objective: v.string(),
    scope: v.array(v.string()),
    // Free-text criteria. Human-readable, not machine-checkable — a reviewer
    // agent reporting "pass" against these is a proxy, which is what the
    // acceptanceCommand below replaces.
    acceptanceCriteria: v.array(v.string()),
    // Executable completion gate. Declared before implementation starts and run
    // on a clean checkout of the resulting commit. See
    // pivot/src/shared/acceptanceGate.ts for the validation rules.
    acceptanceCommand: v.optional(v.object({
      command: v.string(),
      expectExitCode: v.number(),
      timeoutMs: v.number(),
      declaredAt: v.number(),
      // HEAD when the command was declared. Must be an ancestor of the first
      // implementation commit, or the gate is a post-hoc justification.
      declaredAtCommit: v.string(),
    })),
    // Durable result of the last acceptance run, stored on pass and on fail.
    acceptanceEvidence: v.optional(v.object({
      command: v.string(),
      expectedExitCode: v.number(),
      actualExitCode: v.number(),
      timedOut: v.boolean(),
      durationMs: v.number(),
      commit: v.string(),
      declaredAtCommit: v.string(),
      passed: v.boolean(),
      reason: v.string(),
      recordedAt: v.number(),
    })),
    // Effective risk class after evidence-based escalation. Drives how many
    // quality stages the track must run. See pivot/src/shared/riskClass.ts.
    riskClass: v.optional(v.union(
      v.literal('normal'),
      v.literal('elevated'),
      v.literal('critical'),
    )),
    riskEscalatedBy: v.optional(v.array(v.string())),
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
    executorStatus: v.optional(executorStatus),
    reviewerStatus: v.optional(reviewerStatus),
    reviewerSummary: v.optional(v.string()),
    reviewerIssueClass: v.optional(reviewerIssueClass),
    reviewerSeverity: v.optional(reviewerSeverity),
    reviewerResolvedAssumptions: v.optional(v.boolean()),
    recoveryAction: v.optional(recoveryAction),
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
    modelSelectionLog: v.optional(v.object({
      selectedModel: v.string(),
      policy: routingPolicy,
      confidence: v.number(),
      fallbackHistory: v.array(v.object({
        model: v.string(),
        reason: v.string(),
        triggerCondition: v.string(),
      })),
    })),
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
    status: retrospectiveStatus,
    triggeredBy: retrospectiveTriggeredBy,
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
    severity: orchestratorErrorSeverity,
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
