/**
 * Vocabulary contract fixture for `status_vocabulary_unification_20260605`.
 *
 * Single source of truth for the Phase 2 unit test (`validators.test.ts`) and
 * the Phase 4 doctor check. Each entry declares:
 *   - `name`: the canonical export name that MUST exist in `convex/lib/validators.ts`
 *   - `values`: the ordered tuple of literal values the validator must accept
 *   - `definedAt`: the file:line where the inline union currently lives (Phase 2
 *     will delete these sites and replace them with the import). Empty for
 *     validators already exported (see inventory.md §1).
 *
 * This file does NOT import or reference Convex validators. It is a pure
 * data fixture — adding an entry is the contract change. Per test-strategy §2:
 * "Single source — table-driven tests."
 */
export interface VocabularyContract {
  /** Canonical export name from `convex/lib/validators.ts`. */
  name: string
  /** Ordered tuple of literal values. Order is the source-of-truth order. */
  values: readonly string[]
  /** `file:line` of the inline `v.union(v.literal(...))` to be replaced, or `[]` if already exported. */
  definedAt: readonly string[]
}

/**
 * Contract list — locked by inventory.md. Phase 2 will turn each entry's
 * `definedAt` list into a `git rm` and add a single import.
 */
export const VOCABULARY_CONTRACT: readonly VocabularyContract[] = [
  // ── §1: already exported (Green today) ──
  { name: 'projectStatus', values: ['active', 'paused', 'archived'], definedAt: [] },
  { name: 'sourceKind', values: ['manual', 'scanner', 'import'], definedAt: [] },
  { name: 'trackStatus', values: ['new', 'active', 'blocked', 'complete', 'archived'], definedAt: [] },
  { name: 'taskStatus', values: ['backlog', 'ready', 'in_progress', 'review', 'done', 'blocked'], definedAt: ['convex/projectTemplates.ts:13'] },
  { name: 'priority', values: ['low', 'medium', 'high'], definedAt: ['convex/kanban.ts:13', 'convex/projectTemplates.ts:12', 'convex/sprintPlanning.ts:12'] },
  { name: 'boardStatus', values: ['active', 'archived'], definedAt: [] },
  { name: 'issueStatus', values: ['open', 'triaged', 'resolved', 'closed'], definedAt: [] },
  { name: 'runStatus', values: ['queued', 'running', 'succeeded', 'failed', 'cancelled'], definedAt: [] },
  { name: 'retrospectiveStatus', values: ['pending', 'running', 'completed', 'failed'], definedAt: ['convex/schema/contracts.ts:71'] },
  { name: 'notificationType', values: [
      'task_completed', 'task_failed', 'budget_alert', 'circuit_breaker_open',
      'sprint_completed', 'retrospective_ready', 'hook_failure', 'session_resumed',
      'backoff_exhausted', 'retry_cap_reached',
    ], definedAt: [] },
  { name: 'agentRole', values: ['architect', 'executor', 'reviewer', 'merger'], definedAt: ['convex/schema/core.ts:68'] },
  { name: 'agentStatus', values: ['active', 'idle', 'blocked', 'offline'], definedAt: [] },
  { name: 'sprintStatus', values: ['planned', 'active', 'closed'], definedAt: [] },
  { name: 'pipelineStage', values: ['dispatch', 'architect', 'executor', 'reviewer', 'merger'], definedAt: [] },
  { name: 'providerStatus', values: ['active', 'rate_limited', 'idle'], definedAt: [] },
  { name: 'providerHealthStatus', values: ['healthy', 'degraded', 'unhealthy'], definedAt: [] },
  { name: 'abTestStatus', values: ['draft', 'running', 'completed'], definedAt: [] },
  { name: 'supportedModels', values: [
      'claude-opus', 'claude-sonnet', 'gpt-4o', 'gpt-4o-mini', 'gemini-pro', 'gemini-2.5-pro',
    ], definedAt: [] },
  { name: 'routingPolicy', values: ['quality_first', 'cost_first', 'balanced', 'manual'], definedAt: [] },

  // ── §2: to be promoted (Red today) ──
  { name: 'employeeStatus', values: ['active', 'away'], definedAt: [
      'convex/schema/agents.ts:11', 'convex/employees.ts:12', 'convex/employees.ts:111', 'convex/scheduler.ts:26',
    ] },
  { name: 'pipelineRunStatus', values: ['running', 'completed', 'failed'], definedAt: ['convex/schema/tasks.ts:57'] },
  { name: 'reconciliationProposalStatus', values: ['pending', 'applied', 'rejected'], definedAt: [
      'convex/reconciliationEngine.ts:5', 'convex/reconciliationProposals.ts:5', 'convex/schema/operations.ts:97',
    ] },
  { name: 'reconciliationArtifactType', values: ['track', 'task', 'issue'], definedAt: [
      'convex/reconciliationEngine.ts:6', 'convex/reconciliationProposals.ts:6',
      'convex/reconciliationEvents.ts:7', 'convex/reconciliationEvents.ts:20', 'convex/reconciliationEvents.ts:90',
      'convex/schema/operations.ts:77', 'convex/schema/operations.ts:92',
    ] },
  { name: 'reconciliationSourceSide', values: ['convex', 'markdown'], definedAt: [
      'convex/reconciliationEngine.ts:7', 'convex/reconciliationProposals.ts:7', 'convex/schema/operations.ts:95',
    ] },
  { name: 'reconciliationDivergenceType', values: ['added', 'modified', 'deleted'], definedAt: [
      'convex/reconciliationEvents.ts:9', 'convex/reconciliationEvents.ts:22', 'convex/schema/operations.ts:79',
    ] },
  { name: 'reconciliationDecisionType', values: ['apply', 'reject'], definedAt: [
      'convex/reconciliationDecisions.ts:5', 'convex/schema/operations.ts:109',
    ] },
  { name: 'alertType', values: [
      'circuit_open', 'stall_detected', 'budget_breach', 'schema_drift', 'health_check_failed', 'performance_regression',
    ], definedAt: ['convex/alerts.ts:6', 'convex/schema/operations.ts:7'] },
  { name: 'alertSeverity', values: ['critical', 'warning', 'info'], definedAt: [
      'convex/alerts.ts:14', 'convex/fleet.ts:214', 'convex/schema/operations.ts:15',
    ] },
  { name: 'orchestratorErrorSeverity', values: ['fatal', 'warning', 'debug'], definedAt: [
      'convex/orchestratorErrors.ts:10', 'convex/orchestratorErrors.ts:26', 'convex/orchestratorErrors.ts:48', 'convex/schema/contracts.ts:92',
    ] },
  { name: 'analysisSeverity', values: ['error', 'warning', 'info'], definedAt: [
      'convex/analysisResults.ts:12', 'convex/analysisResults.ts:28', 'convex/analysisResults.ts:63', 'convex/schema/analytics.ts:76',
    ] },
  { name: 'budgetPolicy', values: ['strict', 'soft', 'advisory'], definedAt: [
      'convex/budgets.ts:21', 'convex/budgets.ts:52', 'convex/budgets.ts:284', 'convex/schema/analytics.ts:30',
    ] },
  { name: 'budgetPeriodType', values: ['daily', 'weekly', 'monthly'], definedAt: ['convex/budgets.ts:320'] },
  { name: 'notificationChannel', values: ['in_app', 'webhook', 'email'], definedAt: [
      'convex/notifications.ts:32', 'convex/notifications.ts:151', 'convex/schema/operations.ts:52',
    ] },
  { name: 'continuousModeState', values: ['running', 'paused', 'idle'], definedAt: [
      'convex/continuousMode.ts:9', 'convex/continuousMode.ts:58',
    ] },
  { name: 'abTestVariant', values: ['control', 'treatment'], definedAt: [
      'convex/abTests.ts:133', 'convex/abTests.ts:149', 'convex/schema/planning.ts:59',
    ] },
  { name: 'pipelineTriggeredBy', values: ['manual', 'task-complete'], definedAt: ['convex/pipelines.ts:72'] },
  { name: 'harnessTaskClass', values: ['feature', 'bug', 'chore', 'review'], definedAt: [
      'convex/harnessProfiles.ts:33', 'convex/harnessProfiles.ts:39',
    ] },
  { name: 'retrospectiveTriggeredBy', values: ['manual', 'scheduled'], definedAt: [
      'convex/retrospectives.ts:106', 'convex/schema/contracts.ts:77',
    ] },
  { name: 'executorStatus', values: ['succeeded', 'failed'], definedAt: [
      'convex/schema/contracts.ts:25', 'convex/runContracts.ts:30', 'convex/runContracts.ts:123',
    ] },
  { name: 'reviewerStatus', values: ['passed', 'failed', 'needs-changes'], definedAt: [
      'convex/schema/contracts.ts:26', 'convex/runContracts.ts:31', 'convex/runContracts.ts:151',
    ] },
  { name: 'reviewerIssueClass', values: ['correctness', 'security', 'performance', 'style', 'spec_mismatch'], definedAt: [
      'convex/schema/contracts.ts:28', 'convex/runContracts.ts:33', 'convex/runContracts.ts:153',
    ] },
  { name: 'reviewerSeverity', values: ['blocker', 'major', 'minor'], definedAt: [
      'convex/schema/contracts.ts:29', 'convex/runContracts.ts:34', 'convex/runContracts.ts:154',
    ] },
  { name: 'recoveryAction', values: ['retry', 'escalate', 'split', 'replan', 'human_review'], definedAt: [
      'convex/schema/contracts.ts:31', 'convex/runContracts.ts:36', 'convex/runContracts.ts:181',
    ] },
  { name: 'circuitBreakerState', values: ['closed', 'open', 'half-open'], definedAt: [
      'convex/circuitBreakers.ts:12', 'convex/circuitBreakers.ts:33', 'convex/circuitBreakers.ts:68', 'convex/circuitBreakers.ts:95',
    ] },
  { name: 'portfolioHealth', values: ['green', 'yellow', 'red'], definedAt: ['convex/portfolio.ts:85'] },
  { name: 'leaderboardTrend', values: ['up', 'down', 'flat'], definedAt: ['convex/leaderboard.ts:23'] },
  { name: 'leaderboardTimeRange', values: ['7d', '30d', 'all'], definedAt: ['convex/leaderboard.ts:44'] },
  { name: 'performanceTrend', values: ['improving', 'stable', 'declining'], definedAt: ['convex/performance.ts:261'] },
  { name: 'burnAction', values: ['keep', 'drop'], definedAt: ['convex/burnForecast.ts:70'] },
  { name: 'scoreAuditOutcome', values: ['accepted', 'rework', 'rejected', 'regression'], definedAt: ['convex/schema/analytics.ts:114'] },
  { name: 'governanceEventType', values: [
      'budget_breach', 'budget_warning', 'retry_escalation', 'harness_selection', 'review_depth',
    ], definedAt: ['convex/schema/analytics.ts:37'] },
] as const
