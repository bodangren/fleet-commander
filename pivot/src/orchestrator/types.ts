import { ConvexHttpClient } from 'convex/browser';

export type TaskStatus = 'todo' | 'ready' | 'in_progress' | 'blocked' | 'done';
export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface Task {
  projectSlug: string;
  trackId: string;
  taskKey: string;
  title: string;
  status: TaskStatus;
  assignee?: string;
  dependencies: string[];
  updatedAt: number;
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
  slug: string;
  name: string;
  rootPath: string;
  status: 'active' | 'paused' | 'archived';
  source: 'manual' | 'scanner' | 'import';
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
  failureType?: 'exit_code' | 'timeout' | 'unknown';
  output: string;
  coveragePercentage?: number;
  coverageTool?: string;
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
}

export const DEFAULT_CONFIG: OrchestratorConfig = {
  maxRetries: 3,
  baseDelayMs: 5000,
  maxDelayMs: 60000,
  commandTimeoutMs: 600_000,
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

export type ExecuteFn = (
  client: ConvexHttpClient,
  agentName: string,
  taskTitle: string,
  taskKey: string,
  timeoutMs: number,
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
  ) => Promise<void>;
  onTaskCommit?: (
    projectSlug: string,
    rootPath: string,
    taskId: string,
    summary: string,
  ) => Promise<{ commitHash: string }>;
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
