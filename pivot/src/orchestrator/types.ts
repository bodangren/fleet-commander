import { ConvexHttpClient } from 'convex/browser';
import type { Id } from '../../../convex/_generated/dataModel';
import type { QualityProfileType } from '../shared/qualityProfile';
import type { CloseoutEligibilityContext, QualityWorkflowRunner, StageContext } from './qualityWorkflowRunner';

// Source of truth: convex/lib/validators.ts `taskStatus`. Keep these literals in
// sync with that validator so orchestrator writes never fail Convex validation.
export type TaskStatus = 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked';
export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface Employee {
  _id: string;
  name: string;
  role: string;
  skills: string[];
  model: string;
  status: 'active' | 'away';
  createdAt: number;
}

export type PipelineDispatchStage = 'executor' | 'reviewer' | 'merger';

export interface Task {
  _id?: string;
  projectSlug: string;
  trackId: string;
  taskKey: string;
  title: string;
  status: TaskStatus;
  assignee?: string;
  reviewerId?: string;
  mergerId?: string;
  dependencies: string[];
  storyPoints?: number;
  updatedAt: number;
  retryCount?: number;
  startedAt?: number;
  lastDispatchAttemptAt?: number;
  sessionId?: string;
  tags?: Record<string, string>;
  skills?: string[];
  spec?: string;
  /**
   * `risk_class` declared in the track's metadata.json. Drives how many quality
   * stages the task must run. Absent means `normal`; evidence in the task can
   * still escalate it. See `pivot/src/shared/riskClass.ts`.
   */
  riskClass?: 'normal' | 'elevated' | 'critical';
}

/**
 * Resolves the dispatch stage and agent override for a task based on its
 * current status and assigned reviewer/merger IDs.
 *
 * Dispatch routing for `review`-status tasks:
 * - If `reviewerId` is set AND `assignee` does NOT match `mergerId`,
 *   this is a reviewer dispatch.
 * - If `mergerId` is set AND `assignee` matches `mergerId`, the reviewer
 *   already completed and this is a merger dispatch.
 * - If only `mergerId` is set (no `reviewerId`), dispatch as merger.
 * - All other tasks dispatch as executor using `task.assignee`.
 *
 * When a reviewer completes successfully and `mergerId` is present, the caller
 * updates `assignee` to `mergerId` and keeps status `review`, so the next
 * orchestrator cycle routes to the merger stage.
 */
export function resolveDispatchStage(task: Task): {
  stage: PipelineDispatchStage;
  agentOverride?: string;
} {
  if (task.status === 'review') {
    if (task.mergerId && task.assignee === task.mergerId) {
      return { stage: 'merger', agentOverride: task.mergerId };
    }
    if (task.reviewerId) {
      return { stage: 'reviewer', agentOverride: task.reviewerId };
    }
    if (task.mergerId) {
      return { stage: 'merger', agentOverride: task.mergerId };
    }
  }
  return { stage: 'executor' };
}

export interface Track {
  projectSlug: string;
  trackId: string;
  title: string;
  status: 'new' | 'active' | 'blocked' | 'complete' | 'archived';
  version: number;
  updatedAt: number;
}

export interface Project {
  _id: Id<'projects'>;
  slug: string;
  name: string;
  description: string;
  path?: string;
  modelRoutingPolicy?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Agent {
  name: string;
  displayName: string;
  mode: string;
  model: string;
  temperature: number;
  prompt: string;
  toolsJson: string;
  source: string;
  updatedAt: number;
}

export interface Harness {
  name: string;
  commandTemplate: string;
  discoveryCommand?: string;
  source: string;
  updatedAt: number;
}

export interface ExecutionResult {
  taskKey: string;
  status: 'succeeded' | 'failed';
  durationMs: number;
  exitCode?: number;
  error?: string;
  failureType?: 'exit_code' | 'timeout' | 'tokens_exceeded' | 'unknown';
  output: string;
  coveragePercentage?: number;
  coverageTool?: string;
  sessionId?: string;
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
}

export interface CoverageViolation {
  taskKey: string;
  trackId: string;
  trackType: string;
  threshold: number;
  actual: number;
  before?: number;
}

export interface CoverageHooks {
  getTrackType?: (trackId: string) => string;
  getThreshold?: (trackType: string) => number;
  onViolation?: (violation: CoverageViolation) => Promise<void>;
}

export interface QualityWorkflowHooks {
  getEffectiveProfile?: (
    client: ConvexHttpClient,
    projectSlug: string,
    taskKey: string,
  ) => Promise<QualityProfileType>;
  recordProfileSnapshot?: (
    client: ConvexHttpClient,
    projectSlug: string,
    taskKey: string,
    runId: string,
  ) => Promise<void>;
  runner?: QualityWorkflowRunner;
  getStageContext?: (args: {
    task: Task;
    rootPath: string;
    trackContext?: unknown;
  }) => StageContext;
  getCloseoutContext?: (args: {
    task: Task;
    rootPath: string;
    trackContext?: unknown;
  }) => CloseoutEligibilityContext;
  onQualityRunStart?: (
    client: ConvexHttpClient,
    context: { projectSlug: string; taskKey: string; runId: string; profile: { profileName: string; profileVersion: number; stages: unknown[] } },
  ) => Promise<void>;
  onStageResult?: (
    client: ConvexHttpClient,
    context: { projectSlug: string; taskKey: string; runId: string; stageKind: string; role: string; attempt: number; status: string; startedAt: number; finishedAt: number; evidence?: Record<string, unknown> },
  ) => Promise<void>;
  onQualityRunFinish?: (
    client: ConvexHttpClient,
    context: { projectSlug: string; taskKey: string; runId: string; status: 'passed' | 'failed' | 'blocked' | 'cancelled'; reason?: string; finishedAt: number },
  ) => Promise<void>;
}

export interface CandidateTask {
  task: Task;
  trackId: string;
  score: number;
  rationale: string;
}

export interface ParsedIssue {
  title: string;
  description: string;
  severity?: string;
  labels?: string[];
}

export interface OrchestratorConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  commandTimeoutMs: number;
  /** Maximum aggregate Pi input/output tokens when no contract overrides it. */
  maxTokens?: number;
}

export const DEFAULT_CONFIG: OrchestratorConfig = {
  maxRetries: 3,
  baseDelayMs: 10_000,
  maxDelayMs: 60000,
  commandTimeoutMs: 600_000,
  maxTokens: 16_000,
};

export interface ReviewResult {
  status: 'passed' | 'failed' | 'needs-changes';
  summary: string;
  agentComments?: Array<{ file: string; line: number; severity: string; message: string }>;
  depth?: string;
}

export interface IssueHooks {
  createBlocker: (
    projectSlug: string,
    taskKey: string,
    taskTitle: string,
    error: string,
    failureType: string,
    exitCode: number | undefined,
    durationMs: number,
    attempts: number,
  ) => Promise<void>;
  createDelegations: (
    projectSlug: string,
    taskKey: string,
    output: string,
  ) => Promise<number>;
  runReview?: (
    projectSlug: string,
    taskKey: string,
    taskTitle: string,
    output: string,
  ) => Promise<ReviewResult>;
}

/**
 * Runtime context supplied to an execution backend.
 *
 * The project path is intentionally part of the dispatch context rather than
 * inferred by a backend. This keeps project-scoped runs from silently falling
 * back to the orchestrator process directory.
 */
export interface ExecutionOptions {
  sessionId?: string;
  taskContext?: string;
  projectPath?: string;
  maxTokens?: number;
}

export type ExecuteFn = (
  client: ConvexHttpClient,
  agentName: string,
  taskTitle: string,
  taskKey: string,
  timeoutMs: number,
  resolveOptions?: ExecutionOptions,
) => Promise<ExecutionResult>;

export type ContinuousModeStateType = 'running' | 'paused' | 'idle';

export interface ContinuousModeState {
  enabled: boolean;
  state: ContinuousModeStateType;
  intervalMs: number;
  consecutiveFailures: number;
  maxConcurrent: number;
  maxConsecutiveFailures: number;
}

export type RecoveryEventType = 'stalled' | 'retry' | 'circuit-open' | 'circuit-reset' | 'recovered' | 'blocked';

export interface RecoveryEvent {
  taskId: string;
  agentId: string;
  eventType: RecoveryEventType;
  timestamp: number;
  details: string;
}

export type CircuitBreakerStateType = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerState {
  agentId: string;
  state: CircuitBreakerStateType;
  failureCount: number;
  failureWindowStart: number;
  openedAt?: number;
  failureThreshold: number;
  windowMs: number;
  halfOpenTimeoutMs: number;
}

export interface GitHooks {
  onTaskStart?: (
    projectSlug: string,
    rootPath: string,
    taskId: string,
    taskTitle: string,
  ) => Promise<{ branchName: string; branchCreated: boolean; error?: string }>;
  onTaskComplete?: (
    projectSlug: string,
    rootPath: string,
    taskId: string,
    taskTitle: string,
    success: boolean,
    trackId?: string,
    options?: { shouldCleanupBranch?: boolean },
  ) => Promise<void>;
  onTaskCommit?: (
    projectSlug: string,
    rootPath: string,
    taskId: string,
    summary: string,
    trackId?: string,
  ) => Promise<{ commitHash: string }>;
  onMerger?: (
    projectSlug: string,
    rootPath: string,
    taskId: string,
    taskTitle: string,
    branchName: string,
    trackId?: string,
  ) => Promise<{ merged: boolean; targetBranch: string; conflict?: boolean; error?: string }>;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelayMs: 1000,
  maxDelayMs: 4000,
  jitterMs: 500,
};

/**
 * Symphony-compatible retry config.
 * Formula: delay = min(10000 * 2^(attempt-1), max_backoff)
 */
export const SYMPHONY_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 10_000,
  maxDelayMs: 60_000,
  jitterMs: 0,
};
