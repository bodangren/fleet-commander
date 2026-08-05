import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';
import { executorStatus, recoveryAction, reviewerIssueClass, reviewerSeverity, reviewerStatus } from './lib/validators';

const dispatchRejectionEntry = v.object({
  taskKey: v.string(),
  filter: v.string(),
  reason: v.string(),
});

const acceptanceCommandEntry = v.object({
  command: v.string(),
  expectExitCode: v.number(),
  timeoutMs: v.number(),
  declaredAt: v.number(),
  declaredAtCommit: v.string(),
});

const acceptanceEvidenceEntry = v.object({
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
});

const riskClassValue = v.union(
  v.literal('normal'),
  v.literal('elevated'),
  v.literal('critical'),
);

const runContractEntry = v.object({
  taskId: v.string(),
  projectSlug: v.string(),
  objective: v.string(),
  scope: v.array(v.string()),
  acceptanceCriteria: v.array(v.string()),
  acceptanceCommand: v.optional(acceptanceCommandEntry),
  acceptanceEvidence: v.optional(acceptanceEvidenceEntry),
  riskClass: v.optional(riskClassValue),
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
  dispatchRejections: v.optional(v.array(dispatchRejectionEntry)),
  sessionId: v.optional(v.string()),
});

export const createRunContract = mutation({
  args: {
    taskId: v.string(),
    projectSlug: v.string(),
    objective: v.string(),
    scope: v.array(v.string()),
    acceptanceCriteria: v.array(v.string()),
  },
  returns: runContractEntry,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const now = Date.now();
    const entry = {
      taskId: args.taskId,
      projectSlug: args.projectSlug,
      objective: args.objective,
      scope: args.scope,
      acceptanceCriteria: args.acceptanceCriteria,
      createdAt: now,
      harnessName: undefined,
      maxExecutionMs: undefined,
      maxTokens: undefined,
      architectOutput: undefined,
      architectConfidence: undefined,
      architectAssumptions: undefined,
      executorChangedFiles: undefined,
      executorTestsRun: undefined,
      executorUnresolvedAssumptions: undefined,
      executorConfidence: undefined,
      executorBranch: undefined,
      executorCommit: undefined,
      executorStatus: undefined,
      reviewerStatus: undefined,
      reviewerSummary: undefined,
      reviewerIssueClass: undefined,
      reviewerSeverity: undefined,
      reviewerResolvedAssumptions: undefined,
      recoveryAction: undefined,
      recoveryReason: undefined,
      dispatchRejections: undefined,
    };
    await ctx.db.insert('runContracts', entry);
    return entry;
  },
});

/**
 * Declare the executable completion gate for a task.
 *
 * Refuses to overwrite an existing declaration. That immutability is the point:
 * if the gate can be rewritten after the code lands, it stops being evidence
 * that the work met a standard set in advance.
 */
export const declareAcceptanceCommand = mutation({
  args: {
    taskId: v.string(),
    command: v.string(),
    expectExitCode: v.optional(v.number()),
    timeoutMs: v.number(),
    declaredAtCommit: v.string(),
  },
  returns: runContractEntry,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('runContracts')
      .withIndex('by_task', (q) => q.eq('taskId', args.taskId))
      .first();
    if (!existing) {
      throw new Error(`RunContract not found for taskId: ${args.taskId}`);
    }
    if (existing.acceptanceCommand) {
      throw new Error(
        `Acceptance command already declared for ${args.taskId} at commit ` +
          `${existing.acceptanceCommand.declaredAtCommit}. Declarations are immutable.`,
      );
    }
    const acceptanceCommand = {
      command: args.command,
      expectExitCode: args.expectExitCode ?? 0,
      timeoutMs: args.timeoutMs,
      declaredAt: Date.now(),
      declaredAtCommit: args.declaredAtCommit,
    };
    await ctx.db.patch(existing._id, { acceptanceCommand });
    return { ...existing, acceptanceCommand, dispatchRejections: existing.dispatchRejections };
  },
});

/**
 * Record the outcome of an acceptance run. Written on failure as well as on
 * success, so a track cannot be closed by simply not reporting a red gate.
 */
export const recordAcceptanceEvidence = mutation({
  args: {
    taskId: v.string(),
    evidence: acceptanceEvidenceEntry,
  },
  returns: runContractEntry,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('runContracts')
      .withIndex('by_task', (q) => q.eq('taskId', args.taskId))
      .first();
    if (!existing) {
      throw new Error(`RunContract not found for taskId: ${args.taskId}`);
    }
    await ctx.db.patch(existing._id, { acceptanceEvidence: args.evidence });
    return { ...existing, acceptanceEvidence: args.evidence, dispatchRejections: existing.dispatchRejections };
  },
});

/**
 * Persist the effective risk class and any evidence that forced an escalation.
 * Escalation is one-way: a stored class is never lowered.
 */
export const setRiskClass = mutation({
  args: {
    taskId: v.string(),
    riskClass: riskClassValue,
    escalatedBy: v.optional(v.array(v.string())),
  },
  returns: runContractEntry,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('runContracts')
      .withIndex('by_task', (q) => q.eq('taskId', args.taskId))
      .first();
    if (!existing) {
      throw new Error(`RunContract not found for taskId: ${args.taskId}`);
    }
    const order = { normal: 0, elevated: 1, critical: 2 } as const;
    const current = existing.riskClass ?? 'normal';
    const riskClass =
      order[args.riskClass] >= order[current] ? args.riskClass : current;
    const riskEscalatedBy = args.escalatedBy ?? existing.riskEscalatedBy;
    await ctx.db.patch(existing._id, { riskClass, riskEscalatedBy });
    return { ...existing, riskClass, riskEscalatedBy, dispatchRejections: existing.dispatchRejections };
  },
});

export const appendArchitectOutput = mutation({
  args: {
    taskId: v.string(),
    output: v.string(),
    confidence: v.number(),
    assumptions: v.array(v.string()),
  },
  returns: runContractEntry,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('runContracts')
      .withIndex('by_task', (q) => q.eq('taskId', args.taskId))
      .first();
    if (!existing) {
      throw new Error(`RunContract not found for taskId: ${args.taskId}`);
    }
    await ctx.db.patch(existing._id, {
      architectOutput: args.output,
      architectConfidence: args.confidence,
      architectAssumptions: args.assumptions,
    });
    return { ...existing, architectOutput: args.output, architectConfidence: args.confidence, architectAssumptions: args.assumptions, dispatchRejections: existing.dispatchRejections };
  },
});

export const appendExecutorOutput = mutation({
  args: {
    taskId: v.string(),
    changedFiles: v.array(v.string()),
    testsRun: v.array(v.string()),
    unresolvedAssumptions: v.array(v.string()),
    confidence: v.number(),
    branch: v.string(),
    commit: v.string(),
    status: executorStatus,
  },
  returns: runContractEntry,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('runContracts')
      .withIndex('by_task', (q) => q.eq('taskId', args.taskId))
      .first();
    if (!existing) {
      throw new Error(`RunContract not found for taskId: ${args.taskId}`);
    }
    await ctx.db.patch(existing._id, {
      executorChangedFiles: args.changedFiles,
      executorTestsRun: args.testsRun,
      executorUnresolvedAssumptions: args.unresolvedAssumptions,
      executorConfidence: args.confidence,
      executorBranch: args.branch,
      executorCommit: args.commit,
      executorStatus: args.status,
    });
    return { ...existing, executorChangedFiles: args.changedFiles, executorTestsRun: args.testsRun, executorUnresolvedAssumptions: args.unresolvedAssumptions, executorConfidence: args.confidence, executorBranch: args.branch, executorCommit: args.commit, executorStatus: args.status, dispatchRejections: existing.dispatchRejections };
  },
});

export const appendReviewerOutput = mutation({
  args: {
    taskId: v.string(),
    status: reviewerStatus,
    summary: v.string(),
    issueClass: reviewerIssueClass,
    severity: reviewerSeverity,
    resolvedAssumptions: v.optional(v.boolean()),
  },
  returns: runContractEntry,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('runContracts')
      .withIndex('by_task', (q) => q.eq('taskId', args.taskId))
      .first();
    if (!existing) {
      throw new Error(`RunContract not found for taskId: ${args.taskId}`);
    }
    await ctx.db.patch(existing._id, {
      reviewerStatus: args.status,
      reviewerSummary: args.summary,
      reviewerIssueClass: args.issueClass,
      reviewerSeverity: args.severity,
      reviewerResolvedAssumptions: args.resolvedAssumptions,
    });
    return { ...existing, reviewerStatus: args.status, reviewerSummary: args.summary, reviewerIssueClass: args.issueClass, reviewerSeverity: args.severity, reviewerResolvedAssumptions: args.resolvedAssumptions, dispatchRejections: existing.dispatchRejections };
  },
});

export const appendRecoveryOutput = mutation({
  args: {
    taskId: v.string(),
    action: recoveryAction,
    reason: v.string(),
  },
  returns: runContractEntry,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('runContracts')
      .withIndex('by_task', (q) => q.eq('taskId', args.taskId))
      .first();
    if (!existing) {
      throw new Error(`RunContract not found for taskId: ${args.taskId}`);
    }
    await ctx.db.patch(existing._id, {
      recoveryAction: args.action,
      recoveryReason: args.reason,
    });
    return { ...existing, recoveryAction: args.action, recoveryReason: args.reason, dispatchRejections: existing.dispatchRejections };
  },
});

export const appendDispatchRejections = mutation({
  args: {
    taskId: v.string(),
    rejections: v.array(dispatchRejectionEntry),
  },
  returns: runContractEntry,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('runContracts')
      .withIndex('by_task', (q) => q.eq('taskId', args.taskId))
      .first();
    if (!existing) {
      throw new Error(`RunContract not found for taskId: ${args.taskId}`);
    }
    const current = existing.dispatchRejections ?? [];
    await ctx.db.patch(existing._id, {
      dispatchRejections: [...current, ...args.rejections],
    });
    return { ...existing, dispatchRejections: [...current, ...args.rejections] };
  },
});

export const getRunContract = query({
  args: { taskId: v.string() },
  returns: v.union(runContractEntry, v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('runContracts')
      .withIndex('by_task', (q) => q.eq('taskId', args.taskId))
      .first();
    return doc;
  },
});

export const listRunContractsByProject = query({
  args: { projectSlug: v.string() },
  returns: v.array(runContractEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const docs = await ctx.db
      .query('runContracts')
      .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug))
      .order('desc')
      .take(100);
    return docs;
  },
});

export const listRecentRunContracts = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(runContractEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const docs = await ctx.db
      .query('runContracts')
      .withIndex('by_created_at')
      .order('desc')
      .take(args.limit ?? 50);
    return docs;
  },
});

export const listRunContractsSince = query({
  args: { since: v.number(), limit: v.optional(v.number()) },
  returns: v.array(runContractEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const docs = await ctx.db
      .query('runContracts')
      .withIndex('by_created_at', (q) => q.gte('createdAt', args.since))
      .order('asc')
      .take(args.limit ?? 1000);
    return docs;
  },
});