import { v, type Infer } from 'convex/values';

// ── §1: Already exported (original 19) ──

export const projectStatus = v.union(
  v.literal('active'),
  v.literal('paused'),
  v.literal('archived'),
);

export const sourceKind = v.union(
  v.literal('manual'),
  v.literal('scanner'),
  v.literal('import'),
);

export const trackStatus = v.union(
  v.literal('new'),
  v.literal('active'),
  v.literal('blocked'),
  v.literal('complete'),
  v.literal('archived'),
);

export const taskStatus = v.union(
  v.literal('backlog'),
  v.literal('ready'),
  v.literal('in_progress'),
  v.literal('review'),
  v.literal('done'),
  v.literal('blocked'),
);

export const priority = v.union(
  v.literal('low'),
  v.literal('medium'),
  v.literal('high'),
);

export const boardStatus = v.union(
  v.literal('active'),
  v.literal('archived'),
);

export const issueStatus = v.union(
  v.literal('open'),
  v.literal('triaged'),
  v.literal('resolved'),
  v.literal('closed'),
);

export const runStatus = v.union(
  v.literal('queued'),
  v.literal('running'),
  v.literal('succeeded'),
  v.literal('failed'),
  v.literal('cancelled'),
);

export const retrospectiveStatus = v.union(
  v.literal('pending'),
  v.literal('running'),
  v.literal('completed'),
  v.literal('failed'),
);

export const notificationType = v.union(
  v.literal('task_completed'),
  v.literal('task_failed'),
  v.literal('budget_alert'),
  v.literal('circuit_breaker_open'),
  v.literal('sprint_completed'),
  v.literal('retrospective_ready'),
  v.literal('hook_failure'),
  v.literal('session_resumed'),
  v.literal('backoff_exhausted'),
  v.literal('retry_cap_reached'),
);

export const agentRole = v.union(
  v.literal('architect'),
  v.literal('executor'),
  v.literal('reviewer'),
  v.literal('merger'),
);

export const agentStatus = v.union(
  v.literal('active'),
  v.literal('idle'),
  v.literal('blocked'),
  v.literal('offline'),
);

export const sprintStatus = v.union(
  v.literal('planned'),
  v.literal('active'),
  v.literal('closed'),
);

export const pipelineStage = v.union(
  v.literal('dispatch'),
  v.literal('architect'),
  v.literal('executor'),
  v.literal('reviewer'),
  v.literal('merger'),
);

export const providerStatus = v.union(
  v.literal('active'),
  v.literal('rate_limited'),
  v.literal('idle'),
);

export const providerHealthStatus = v.union(
  v.literal('healthy'),
  v.literal('degraded'),
  v.literal('unhealthy'),
);

export const abTestStatus = v.union(
  v.literal('draft'),
  v.literal('running'),
  v.literal('completed'),
);

export const supportedModels = v.union(
  v.literal('claude-opus'),
  v.literal('claude-sonnet'),
  v.literal('gpt-4o'),
  v.literal('gpt-4o-mini'),
  v.literal('gemini-pro'),
  v.literal('gemini-2.5-pro'),
);

export const routingPolicy = v.union(
  v.literal('quality_first'),
  v.literal('cost_first'),
  v.literal('balanced'),
  v.literal('manual'),
);

// ── §2: Promoted from inline definitions (Phase 2) ──

export const employeeStatus = v.union(
  v.literal('active'),
  v.literal('away'),
);

export const pipelineRunStatus = v.union(
  v.literal('running'),
  v.literal('completed'),
  v.literal('failed'),
);

export const reconciliationProposalStatus = v.union(
  v.literal('pending'),
  v.literal('applied'),
  v.literal('rejected'),
);

export const reconciliationArtifactType = v.union(
  v.literal('track'),
  v.literal('task'),
  v.literal('issue'),
);

export const reconciliationSourceSide = v.union(
  v.literal('convex'),
  v.literal('markdown'),
);

export const reconciliationDivergenceType = v.union(
  v.literal('added'),
  v.literal('modified'),
  v.literal('deleted'),
);

export const reconciliationDecisionType = v.union(
  v.literal('apply'),
  v.literal('reject'),
);

export const alertType = v.union(
  v.literal('circuit_open'),
  v.literal('stall_detected'),
  v.literal('budget_breach'),
  v.literal('schema_drift'),
  v.literal('health_check_failed'),
  v.literal('performance_regression'),
);

export const alertSeverity = v.union(
  v.literal('critical'),
  v.literal('warning'),
  v.literal('info'),
);

export const orchestratorErrorSeverity = v.union(
  v.literal('fatal'),
  v.literal('warning'),
  v.literal('debug'),
);

export const analysisSeverity = v.union(
  v.literal('error'),
  v.literal('warning'),
  v.literal('info'),
);

export const budgetPolicy = v.union(
  v.literal('strict'),
  v.literal('soft'),
  v.literal('advisory'),
);

export const budgetPeriodType = v.union(
  v.literal('daily'),
  v.literal('weekly'),
  v.literal('monthly'),
);

export const notificationChannel = v.union(
  v.literal('in_app'),
  v.literal('webhook'),
  v.literal('email'),
);

export const continuousModeState = v.union(
  v.literal('running'),
  v.literal('paused'),
  v.literal('idle'),
);

export const abTestVariant = v.union(
  v.literal('control'),
  v.literal('treatment'),
);

export const harnessTaskClass = v.union(
  v.literal('feature'),
  v.literal('bug'),
  v.literal('chore'),
  v.literal('review'),
);

export const retrospectiveTriggeredBy = v.union(
  v.literal('manual'),
  v.literal('scheduled'),
);

export const executorStatus = v.union(
  v.literal('succeeded'),
  v.literal('failed'),
);

export const reviewerStatus = v.union(
  v.literal('passed'),
  v.literal('failed'),
  v.literal('needs-changes'),
);

export const reviewerIssueClass = v.union(
  v.literal('correctness'),
  v.literal('security'),
  v.literal('performance'),
  v.literal('style'),
  v.literal('spec_mismatch'),
);

export const reviewerSeverity = v.union(
  v.literal('blocker'),
  v.literal('major'),
  v.literal('minor'),
);

export const recoveryAction = v.union(
  v.literal('retry'),
  v.literal('escalate'),
  v.literal('split'),
  v.literal('replan'),
  v.literal('human_review'),
);

export const circuitBreakerState = v.union(
  v.literal('closed'),
  v.literal('open'),
  v.literal('half-open'),
);

export const portfolioHealth = v.union(
  v.literal('green'),
  v.literal('yellow'),
  v.literal('red'),
);

export const leaderboardTrend = v.union(
  v.literal('up'),
  v.literal('down'),
  v.literal('flat'),
);

export const leaderboardTimeRange = v.union(
  v.literal('7d'),
  v.literal('30d'),
  v.literal('all'),
);

export const performanceTrend = v.union(
  v.literal('improving'),
  v.literal('stable'),
  v.literal('declining'),
);

export const burnAction = v.union(
  v.literal('keep'),
  v.literal('drop'),
);

export const scoreAuditOutcome = v.union(
  v.literal('accepted'),
  v.literal('rework'),
  v.literal('rejected'),
  v.literal('regression'),
);

export const governanceEventType = v.union(
  v.literal('budget_breach'),
  v.literal('budget_warning'),
  v.literal('retry_escalation'),
  v.literal('harness_selection'),
  v.literal('review_depth'),
);

// ── Derived TypeScript types ──

export type ProjectStatus = Infer<typeof projectStatus>;
export type SourceKind = Infer<typeof sourceKind>;
export type TrackStatus = Infer<typeof trackStatus>;
export type TaskStatus = Infer<typeof taskStatus>;
export type Priority = Infer<typeof priority>;
export type BoardStatus = Infer<typeof boardStatus>;
export type IssueStatus = Infer<typeof issueStatus>;
export type RunStatus = Infer<typeof runStatus>;
export type RetrospectiveStatus = Infer<typeof retrospectiveStatus>;
export type NotificationType = Infer<typeof notificationType>;
export type AgentRole = Infer<typeof agentRole>;
export type AgentStatus = Infer<typeof agentStatus>;
export type SprintStatus = Infer<typeof sprintStatus>;
export type PipelineStage = Infer<typeof pipelineStage>;
export type ProviderStatus = Infer<typeof providerStatus>;
export type ProviderHealthStatus = Infer<typeof providerHealthStatus>;
export type AbTestStatus = Infer<typeof abTestStatus>;
export type SupportedModels = Infer<typeof supportedModels>;
export type RoutingPolicy = Infer<typeof routingPolicy>;
export type EmployeeStatus = Infer<typeof employeeStatus>;
export type PipelineRunStatus = Infer<typeof pipelineRunStatus>;
export type ReconciliationProposalStatus = Infer<typeof reconciliationProposalStatus>;
export type ReconciliationArtifactType = Infer<typeof reconciliationArtifactType>;
export type ReconciliationSourceSide = Infer<typeof reconciliationSourceSide>;
export type ReconciliationDivergenceType = Infer<typeof reconciliationDivergenceType>;
export type ReconciliationDecisionType = Infer<typeof reconciliationDecisionType>;
export type AlertType = Infer<typeof alertType>;
export type AlertSeverity = Infer<typeof alertSeverity>;
export type OrchestratorErrorSeverity = Infer<typeof orchestratorErrorSeverity>;
export type AnalysisSeverity = Infer<typeof analysisSeverity>;
export type BudgetPolicy = Infer<typeof budgetPolicy>;
export type BudgetPeriodType = Infer<typeof budgetPeriodType>;
export type NotificationChannel = Infer<typeof notificationChannel>;
export type ContinuousModeState = Infer<typeof continuousModeState>;
export type AbTestVariant = Infer<typeof abTestVariant>;
export type HarnessTaskClass = Infer<typeof harnessTaskClass>;
export type RetrospectiveTriggeredBy = Infer<typeof retrospectiveTriggeredBy>;
export type ExecutorStatus = Infer<typeof executorStatus>;
export type ReviewerStatus = Infer<typeof reviewerStatus>;
export type ReviewerIssueClass = Infer<typeof reviewerIssueClass>;
export type ReviewerSeverity = Infer<typeof reviewerSeverity>;
export type RecoveryAction = Infer<typeof recoveryAction>;
export type CircuitBreakerState = Infer<typeof circuitBreakerState>;
export type PortfolioHealth = Infer<typeof portfolioHealth>;
export type LeaderboardTrend = Infer<typeof leaderboardTrend>;
export type LeaderboardTimeRange = Infer<typeof leaderboardTimeRange>;
export type PerformanceTrend = Infer<typeof performanceTrend>;
export type BurnAction = Infer<typeof burnAction>;
export type ScoreAuditOutcome = Infer<typeof scoreAuditOutcome>;
export type GovernanceEventType = Infer<typeof governanceEventType>;

// ── Display maps (co-located with types) ──

export const taskStatusDisplay: Record<string, string> = {
  backlog: '#6b7280',
  ready: '#3b82f6',
  in_progress: '#f59e0b',
  review: '#8b5cf6',
  done: '#10b981',
  blocked: '#ef4444',
};

export const runStatusDisplay: Record<string, string> = {
  queued: '#6b7280',
  running: '#3b82f6',
  succeeded: '#10b981',
  failed: '#ef4444',
  cancelled: '#6b7280',
};

export const sprintStatusDisplay: Record<string, string> = {
  planned: '#8b5cf6',
  active: '#3b82f6',
  closed: '#10b981',
};

export const providerStatusDisplay: Record<string, string> = {
  active: '#3b82f6',
  rate_limited: '#f97316',
  idle: '#6b7280',
};

export const providerHealthStatusDisplay: Record<string, string> = {
  healthy: '#10b981',
  degraded: '#f59e0b',
  unhealthy: '#ef4444',
};

export const abTestStatusDisplay: Record<string, string> = {
  draft: '#6b7280',
  running: '#3b82f6',
  completed: '#10b981',
};
