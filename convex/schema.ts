import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import {
  issueStatus,
  projectStatus,
  runStatus,
  sourceKind,
  taskStatus,
  trackStatus,
} from './lib/validators';

export default defineSchema({
  projects: defineTable({
    slug: v.string(),
    name: v.string(),
    rootPath: v.string(),
    status: projectStatus,
    source: sourceKind,
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSyncedAt: v.optional(v.number()),
  })
    .index('by_slug', ['slug'])
    .index('by_status', ['status']),

  tracks: defineTable({
    projectSlug: v.string(),
    trackId: v.string(),
    title: v.string(),
    status: trackStatus,
    specMarkdown: v.string(),
    planMarkdown: v.string(),
    version: v.number(),
    updatedAt: v.number(),
  })
    .index('by_project', ['projectSlug'])
    .index('by_project_and_track', ['projectSlug', 'trackId'])
    .index('by_status', ['status']),

  tasks: defineTable({
    projectSlug: v.string(),
    trackId: v.string(),
    taskKey: v.string(),
    title: v.string(),
    status: taskStatus,
    assignee: v.optional(v.string()),
    dependencies: v.array(v.string()),
    updatedAt: v.number(),
    retryCount: v.optional(v.number()),
    startedAt: v.optional(v.number()),
  })
    .index('by_project', ['projectSlug'])
    .index('by_project_and_track', ['projectSlug', 'trackId'])
    .index('by_track_and_status', ['trackId', 'status'])
    .index('by_status', ['status'])
    .index('by_taskKey', ['taskKey']),

  issues: defineTable({
    projectSlug: v.string(),
    trackId: v.optional(v.string()),
    issueId: v.string(),
    title: v.string(),
    body: v.string(),
    status: issueStatus,
    assignedAgent: v.optional(v.string()),
    sourcePath: v.optional(v.string()),
    openedAt: v.number(),
    resolvedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index('by_project', ['projectSlug'])
    .index('by_project_and_status', ['projectSlug', 'status'])
    .index('by_issue_id', ['issueId'])
    .index('by_status', ['status']),

  executionLogs: defineTable({
    projectSlug: v.string(),
    runId: v.string(),
    trackId: v.optional(v.string()),
    status: runStatus,
    summary: v.string(),
    rawOutput: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_project', ['projectSlug'])
    .index('by_project_and_run', ['projectSlug', 'runId']),

  settings: defineTable({
    scope: v.string(),
    key: v.string(),
    valueJson: v.string(),
    updatedAt: v.number(),
  })
    .index('by_scope', ['scope'])
    .index('by_scope_and_key', ['scope', 'key']),

  agents: defineTable({
    name: v.string(),
    displayName: v.string(),
    mode: v.string(),
    model: v.string(),
    temperature: v.number(),
    prompt: v.string(),
    toolsJson: v.string(),
    source: sourceKind,
    updatedAt: v.number(),
  })
    .index('by_name', ['name'])
    .index('by_source', ['source']),

  harnesses: defineTable({
    name: v.string(),
    commandTemplate: v.string(),
    discoveryCommand: v.optional(v.string()),
    source: sourceKind,
    updatedAt: v.number(),
  })
    .index('by_name', ['name'])
    .index('by_source', ['source']),

  sprints: defineTable({
    projectSlug: v.string(),
    name: v.string(),
    status: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    goal: v.optional(v.string()),
    taskKeys: v.array(v.string()),
    updatedAt: v.number(),
  })
    .index('by_project', ['projectSlug']),

  workRuns: defineTable({
    projectSlug: v.string(),
    runId: v.string(),
    status: runStatus,
    selectedTaskKey: v.optional(v.string()),
    runnerHost: v.optional(v.string()),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
  })
    .index('by_project', ['projectSlug'])
    .index('by_project_and_status', ['projectSlug', 'status'])
    .index('by_run_id', ['runId']),

  pipelineExecutions: defineTable({
    executionId: v.string(),
    pipelineName: v.string(),
    projectId: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('running'),
      v.literal('succeeded'),
      v.literal('failed'),
      v.literal('cancelled'),
    ),
    stagesJson: v.string(),
    triggeredBy: v.union(v.literal('manual'), v.literal('task-complete')),
    triggeredByTaskId: v.optional(v.string()),
    envOverrideJson: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_execution_id', ['executionId'])
    .index('by_pipeline_name', ['pipelineName'])
    .index('by_status', ['status']),

  recoveryLog: defineTable({
    taskId: v.string(),
    agentId: v.string(),
    eventType: v.union(
      v.literal('stalled'),
      v.literal('retry'),
      v.literal('circuit-open'),
      v.literal('circuit-reset'),
      v.literal('recovered'),
      v.literal('blocked'),
    ),
    timestamp: v.number(),
    details: v.string(),
  })
    .index('by_task_id', ['taskId'])
    .index('by_agent_id', ['agentId'])
    .index('by_timestamp', ['timestamp']),

  circuitBreakers: defineTable({
    agentId: v.string(),
    state: v.union(
      v.literal('closed'),
      v.literal('open'),
      v.literal('half-open'),
    ),
    failureCount: v.number(),
    failureWindowStart: v.number(),
    openedAt: v.optional(v.number()),
    failureThreshold: v.number(),
    windowMs: v.number(),
    halfOpenTimeoutMs: v.number(),
    updatedAt: v.number(),
  })
    .index('by_agent_id', ['agentId'])
    .index('by_state', ['state']),

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

  runContracts: defineTable({
    taskId: v.string(),
    projectSlug: v.string(),
    objective: v.string(),
    scope: v.array(v.string()),
    acceptanceCriteria: v.array(v.string()),
    createdAt: v.number(),
    harnessName: v.optional(v.string()),
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
    recoveryAction: v.optional(v.union(v.literal('retry'), v.literal('escalate'), v.literal('split'), v.literal('replan'), v.literal('human_review'))),
    recoveryReason: v.optional(v.string()),
    dispatchRejections: v.optional(v.array(v.object({
      taskKey: v.string(),
      filter: v.string(),
      reason: v.string(),
    }))),
  })
    .index('by_task', ['taskId'])
    .index('by_created_at', ['createdAt'])
    .index('by_project', ['projectSlug']),

  harnessProfiles: defineTable({
    name: v.string(),
    binary: v.string(),
    discoveryCommand: v.optional(v.string()),
    discoveryParseStrategy: v.optional(v.string()),
    discoveryPattern: v.optional(v.string()),
    discoveryNotes: v.optional(v.string()),
    invocationTemplate: v.string(),
    invocationFlagsJson: v.string(),
    capabilitiesJson: v.string(),
    policyJson: v.string(),
    updatedAt: v.number(),
  })
    .index('by_name', ['name']),

  reconciliationEvents: defineTable({
    projectSlug: v.string(),
    artifactType: v.union(v.literal('track'), v.literal('task'), v.literal('issue')),
    artifactId: v.string(),
    divergenceType: v.union(v.literal('added'), v.literal('modified'), v.literal('deleted')),
    conductorHash: v.string(),
    canonicalHash: v.string(),
    description: v.string(),
    counter: v.number(),
    createdAt: v.number(),
  })
    .index('by_project', ['projectSlug'])
    .index('by_artifact', ['artifactType', 'artifactId'])
    .index('by_created_at', ['createdAt']),

  reconciliationProposals: defineTable({
    projectSlug: v.string(),
    artifactType: v.union(v.literal('track'), v.literal('task'), v.literal('issue')),
    artifactId: v.string(),
    patchJson: v.string(),
    sourceSide: v.union(v.literal('convex'), v.literal('markdown')),
    reason: v.string(),
    status: v.union(v.literal('pending'), v.literal('applied'), v.literal('rejected')),
    eventId: v.optional(v.string()),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index('by_project', ['projectSlug'])
    .index('by_artifact', ['artifactType', 'artifactId'])
    .index('by_status', ['status'])
    .index('by_project_and_status', ['projectSlug', 'status']),

  reconciliationDecisions: defineTable({
    proposalId: v.string(),
    decision: v.union(v.literal('apply'), v.literal('reject')),
    reason: v.optional(v.string()),
    conductorHash: v.string(),
    canonicalHash: v.string(),
    createdAt: v.number(),
  })
    .index('by_proposal', ['proposalId'])
    .index('by_hashes', ['conductorHash', 'canonicalHash']),

  dispatchPolicyStats: defineTable({
    persona: v.string(),
    taskKind: v.string(),
    repoType: v.string(),
    meanDurationMs: v.number(),
    p50Cost: v.number(),
    p90Cost: v.number(),
    reviewFailRate: v.number(),
    retryRate: v.number(),
    blockerCreationRate: v.number(),
    coverageRegressionRate: v.number(),
    sampleCount: v.number(),
    windowDays: v.number(),
    insufficientData: v.boolean(),
    lastUpdatedAt: v.number(),
  })
    .index('by_key', ['persona', 'taskKind', 'repoType'])
    .index('by_last_updated', ['lastUpdatedAt']),

  harnessReliabilityStats: defineTable({
    harnessName: v.string(),
    successRate7d: v.number(),
    medianLatencyMs: v.number(),
    averageTokens: v.number(),
    reviewPassRateByTaskClassJson: v.string(),
    topFailureModesJson: v.string(),
    lastUpdatedAt: v.number(),
  })
    .index('by_name', ['harnessName'])
    .index('by_last_updated', ['lastUpdatedAt']),

  policyWeights: defineTable({
    name: v.string(),
    weightsJson: v.string(),
    version: v.number(),
    createdAt: v.number(),
  })
    .index('by_name', ['name'])
    .index('by_version', ['name', 'version']),

  scoreAudit: defineTable({
    dispatchedAt: v.number(),
    chosenTaskId: v.string(),
    candidatesJson: v.string(),
    breakdownJson: v.string(),
    justification: v.string(),
    weightsVersion: v.number(),
    llmTieBreak: v.boolean(),
  })
    .index('by_dispatched_at', ['dispatchedAt'])
    .index('by_chosen_task', ['chosenTaskId']),

  budgets: defineTable({
    scope: v.string(),
    periodStart: v.number(),
    periodEnd: v.number(),
    cap: v.number(),
    spent: v.number(),
    policy: v.union(v.literal('strict'), v.literal('soft'), v.literal('advisory')),
    updatedAt: v.number(),
  })
    .index('by_scope', ['scope']),

  governanceEvents: defineTable({
    scope: v.string(),
    eventType: v.union(
      v.literal('budget_breach'),
      v.literal('budget_warning'),
      v.literal('retry_escalation'),
      v.literal('harness_selection'),
      v.literal('review_depth'),
    ),
    payloadJson: v.string(),
    createdAt: v.number(),
  })
    .index('by_scope', ['scope'])
    .index('by_created_at', ['createdAt'])
    .index('by_scope_and_eventType_and_createdAt', ['scope', 'eventType', 'createdAt'])
    .index('by_eventType_and_createdAt', ['eventType', 'createdAt'])
    .index('by_scope_and_createdAt', ['scope', 'createdAt']),

  simulationRuns: defineTable({
    windowDays: v.number(),
    candidateWeightsJson: v.string(),
    candidateRulesJson: v.string(),
    reportJson: v.string(),
    createdAt: v.number(),
  })
    .index('by_created_at', ['createdAt']),
});
