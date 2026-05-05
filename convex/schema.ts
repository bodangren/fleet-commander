import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import {
  issueStatus,
  notificationType,
  projectStatus,
  runStatus,
  sourceKind,
  taskStatus,
  trackStatus,
} from './lib/validators';

export default defineSchema({
  systemMetadata: defineTable({
    key: v.string(),
    valueJson: v.string(),
    updatedAt: v.number(),
  })
    .index('by_key', ['key']),

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
    lastDispatchAttemptAt: v.optional(v.number()),
    sessionId: v.optional(v.string()),
  })
    .index('by_project', ['projectSlug'])
    .index('by_project_and_track', ['projectSlug', 'trackId'])
    .index('by_track_and_status', ['trackId', 'status'])
    .index('by_status', ['status'])
    .index('by_taskKey', ['taskKey'])
    .index('by_updated_at', ['updatedAt'])
    .index('by_status_and_updated_at', ['status', 'updatedAt']),

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
    .index('by_project_and_run', ['projectSlug', 'runId'])
    .index('by_created_at', ['createdAt'])
    .index('by_status_and_created_at', ['status', 'createdAt']),

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
    loadMs: v.optional(v.number()),
    scoreMs: v.optional(v.number()),
    executeMs: v.optional(v.number()),
    persistMs: v.optional(v.number()),
    hookBeforeMs: v.optional(v.number()),
    hookAfterMs: v.optional(v.number()),
    totalMs: v.optional(v.number()),
  })
    .index('by_project', ['projectSlug'])
    .index('by_project_and_status', ['projectSlug', 'status'])
    .index('by_run_id', ['runId'])
    .index('by_started_at', ['startedAt'])
    .index('by_status_and_started_at', ['status', 'startedAt'])
    .index('by_runnerHost_and_started_at', ['runnerHost', 'startedAt']),

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
    lastFailureType: v.optional(v.string()),
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
    beforeRunHook: v.optional(v.string()),
    afterRunHook: v.optional(v.string()),
    afterCreateHook: v.optional(v.string()),
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
    meanDurationMs: v.optional(v.number()),
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
    outcome: v.optional(v.union(v.literal('accepted'), v.literal('rework'), v.literal('rejected'), v.literal('regression'))),
    outcomeRecordedAt: v.optional(v.number()),
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

  analysisResults: defineTable({
    projectSlug: v.string(),
    executionId: v.string(),
    tool: v.string(),
    file: v.string(),
    line: v.optional(v.number()),
    column: v.optional(v.number()),
    severity: v.union(v.literal('error'), v.literal('warning'), v.literal('info')),
    message: v.string(),
    rule: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_project', ['projectSlug'])
    .index('by_execution', ['executionId'])
    .index('by_project_and_execution', ['projectSlug', 'executionId'])
    .index('by_severity', ['severity']),

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

  notifications: defineTable({
    userId: v.string(),
    type: notificationType,
    title: v.string(),
    body: v.string(),
    channel: v.union(v.literal('in_app'), v.literal('webhook'), v.literal('email')),
    read: v.boolean(),
    createdAt: v.number(),
    metadata: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_read', ['userId', 'read'])
    .index('by_user_and_type', ['userId', 'type'])
    .index('by_created_at', ['createdAt']),

  notificationPreferences: defineTable({
    userId: v.string(),
    muteAll: v.boolean(),
    inAppEnabled: v.boolean(),
    webhookUrl: v.optional(v.string()),
    webhookEnabled: v.boolean(),
    email: v.optional(v.string()),
    emailEnabled: v.boolean(),
    typeFilters: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId']),

  alerts: defineTable({
    type: v.union(
      v.literal('circuit_open'),
      v.literal('stall_detected'),
      v.literal('budget_breach'),
      v.literal('schema_drift'),
      v.literal('health_check_failed'),
    ),
    severity: v.union(v.literal('critical'), v.literal('warning'), v.literal('info')),
    message: v.string(),
    contextJson: v.string(),
    resolved: v.boolean(),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_type', ['type'])
    .index('by_severity', ['severity'])
    .index('by_resolved', ['resolved'])
    .index('by_created_at', ['createdAt']),
});
