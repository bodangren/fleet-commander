# Tracks Registry — Fleet Commander Operational Dashboard

## Project Vision

Fleet Commander is a **local-first autonomous development team** built around a Bun local runtime and Convex as canonical state. The goal is a fully operational, self-directed development team modeled after strong engineering practices: sprint planning, intelligent task dispatch, automated testing, code review, CI/CD, and retrospective analysis.

---

## Active Tracks

### Reliability Engineering (2026-05-04)

- [x] **Track: Enforce Contract Reliability Constraints**
      _Link: [./tracks/enforce_contract_reliability_20260504/](./tracks/enforce_contract_reliability_20260504/)_
      _Enforce session continuity, mandatory testing, strict SLAs, and workflow compliance using Run Contracts. All phases complete; remaining deferred items tracked in fix_circuit_breaker_sla_tags_20260504 and TD-032._

### Quality Remediation (2026-05-05)

- [x] **Track: Quality Remediation — 2026-05-05 Audit**
      _Link: [./tracks/remediation_20260505_audit/](./tracks/remediation_20260505_audit/)_
      _24-hour audit of 13 commits: verified 17/17 fixes from remediation_20260504_review; remediated scheduler self-HTTP, frontend test timeout (false alarm — 166s suite), closed 3 pending tracks, added circuit breaker SLA tagging, added NaN protection, cleaned plan markers, archived review track._

### Quality Remediation (2026-05-04)

- [x] **Track: Quality Remediation — 2026-05-04 Audit**
      _Link: [./archive/remediation_20260504_audit/](./archive/remediation_20260504_audit/)_
      _Fixed: false completion claims committed, deriveTaskKind uses track-name inference, isSourceFile includes convex/, sessionResumeMs stub removed, PerformanceDashboard wired with PhaseBreakdown + PhaseTrends, getSprintById typing fixed. Open items spun into focused tracks below._

- [x] **Track: Fix Combined Token Limit in Executor**
      _Link: [./tracks/fix_token_limit_combined_20260504/](./tracks/fix_token_limit_combined_20260504/)_
      _Replace per-stream maxTokens check with shared stdout+stderr counter. TD-039. Already implemented (commit 2a986a3); plan markers now checked._


- [x] **Track: Tag Circuit Breaker Failures by SLA Breach Type**
      _Link: [./tracks/fix_circuit_breaker_sla_tags_20260504/](./tracks/fix_circuit_breaker_sla_tags_20260504/)_
      _Differentiate circuit breaker failures: `recordCircuitFailure` now accepts optional `failureType`; stored as `lastFailureType` on circuit breaker doc; orchestrator passes `lastResult.failureType`. Existing failure types (`exit_code`, `timeout`, `tokens_exceeded`, `unknown`) already in use._

- [x] **Track: Quality Remediation — 2026-05-04 Review** _(Archived)_
      _Link: [./archive/remediation_20260504_review/](./archive/remediation_20260504_review/)_
      _24-hour code review findings: fabricated metrics (medianLatencyMs/averageTokens), agent prompt/validation mismatch blocking retrospectives, XSS in MarkdownViewer, `as any` casts, missing test coverage, PhaseTrends hidden data, plan marker mismatches. All phases implemented and verified._

### Foundational Fixes (2026-05-01)

- [x] **Track: Foundational Fixes** *(Completed — remaining work split into focused tracks below)*
      _Link: [./archive/foundational_fixes_20260501/](./archive/foundational_fixes_20260501/)_
      _Completed: README/AGENTS.md updates, 3 ADRs, orchestrator structured logging with orchestratorErrors table, git route security with branch validation, config module, dependency fixes, CI workflow. Deferred: integration tests, schema resilience, git v2, dispatch scoring v2, frontend stability, observability stack._

### Architecture Improvements (2026-05-02) — ALL COMPLETE

| Week | Track | Status |
|---|---|---|
| 1 | docs_truth_up | ✅ Complete |
| 1–2 | sync_one_way | ✅ Complete |
| 2–4 | convex_bun_failover (Phase 1) | ✅ Complete (Phase 2 deferred) |
| 4–5 | weight_tuning_loop (items 1+2) | ✅ Complete (shadow scoring deferred) |

### Phase 5 Follow-up (2026-05-01) — ALL COMPLETE

### Policy-Governed Execution Control Plane (consultant plan, 2026-04-15)

Sequenced by dependency. Agents MUST respect `depends_on` in `metadata.json` — do not start a track whose deps are incomplete.

**Phase A — Foundation (sequence: A1 → A2 ∥ A4 → A3 → A5)**

- [x] **Track: Run Contract Protocol (A1)**
      _Link: [./archive/run_contract_protocol_20260415/](./archive/run_contract_protocol_20260415/)_
      _Typed stage contracts for architect/executor/reviewer/recovery. Load-bearing — blocks most Phase B work._

- [x] **Track: Harness Capability Schema (A2)**
      _Link: [./archive/harness_capability_schema_20260415/](./archive/harness_capability_schema_20260415/)_
      _Extend harness YAML with capabilities + policy blocks; mirror to Convex `harnessProfiles`._

- [x] **Track: Reconciliation Event Logging (A4)**
      _Link: [./archive/reconciliation_event_logging_20260415/](./archive/reconciliation_event_logging_20260415/)_
      _Observability-only drift detection between Convex canonical + `measure/` exports._

- [x] **Track: Dispatch Hard Constraints (A3)**
      _Link: [./archive/dispatch_hard_constraints_20260415/](./archive/dispatch_hard_constraints_20260415/)_
      _Deterministic eligibility filters in Bun; dispatcher LLM only tie-breaks. Depends on A2._

- [x] **Track: Run Timeline UI (A5)**
      _Link: [./archive/run_timeline_ui_20260415/](./archive/run_timeline_ui_20260415/)_
      _Per-task timeline rendered from run contracts + dispatch rejections. Depends on A1 + A3._

**Phase B — Adaptive (sequence: B1 → B2 → B3, B4 after B1+B2)**

- [x] **Track: Dispatch Policy Stats (B1)**
      _Link: [./archive/dispatch_policy_stats_20260415/](./archive/dispatch_policy_stats_20260415/)_
      _Rollup tables over run contract history. Depends on A1._

- [x] **Track: Adaptive Scoring Engine (B2)**
      _Link: [./archive/adaptive_scoring_engine_20260415/](./archive/adaptive_scoring_engine_20260415/)_
      _Deterministic numeric score from B1 + A2. Dispatcher prompt becomes justification-only. Depends on B1, A3, A2._

- [x] **Track: Economic Control Plane (B3)**
      _Link: [./archive/economic_control_plane_20260415/](./archive/economic_control_plane_20260415/)_
      _Budget modulates dispatch/retry/harness selection/review depth. Depends on B2._

- [x] **Track: Ops Console (B4)**
      _Link: [./archive/ops_console_20260415/](./archive/ops_console_20260415/)_
      _`/ops` surface: Queue / Fleet / Timeline / Governance tabs. Depends on B1, B2, A4._

**Phase C — Governance & Scale (sequence: C1 and C2 parallel after prerequisites; C3 last)**

- [x] **Track: State Reconciliation Engine (C1)**
      _Link: [./archive/state_reconciliation_engine_20260415/](./archive/state_reconciliation_engine_20260415/)_
      _Upgrade A4 from logging to enforcement: ownership rules, conflict UI. Depends on A4._

- [x] **Track: Resource Allocation & Concurrency Policy (C2)**
      _Link: [./archive/resource_allocation_policy_20260415/](./archive/resource_allocation_policy_20260415/)_
      _Per-repo/per-harness concurrency, worktree mgmt, affinity, budget pacing. Depends on B3, A2._

- [x] **Track: Policy Simulation & Replay (C3)**
      _Link: [./archive/policy_simulation_replay_20260415/](./archive/policy_simulation_replay_20260415/)_
      _Replay historical dispatches with alternative weights. Depends on A1, B1, B2._

### E2E Test Coverage (2026-04-23)

- [x] **Track: E2E Tests for Untested Frontend Pages**
      _Link: [./archive/e2e_untested_pages_20260423/](./archive/e2e_untested_pages_20260423/)_
      _Added Playwright e2e tests for SimulatePage, Reconcile, AgentEditorPage, HarnessEditorPage. Fixed ReconcilePage to fetch proposals from API._

- [x] **Track: E2E Tests for TaskTimelinePage**
      _Link: [./archive/e2e_task_timeline_20260424/](./archive/e2e_task_timeline_20260424/)_
      _Add Playwright e2e test coverage for TaskTimelinePage, the only remaining untested frontend page._

### Tech Debt Fixes (2026-04-23)

- [x] **Track: Fix Hardcoded Harness Name in Rollup (TD-027)**
      _Link: [./archive/fix_hardcoded_harness_name_20260423/](./archive/fix_hardcoded_harness_name_20260423/)_
      _Add harnessName to runContracts schema; fix groupByHarness and identifyDirtyBuckets to use actual harness name instead of hardcoded 'opencode'._

### Frontend Bug Fixes (2026-04-24)

- [x] **Track: Fix Frontend Bugs**
      _Link: [./archive/fix_frontend_bugs_20260424/](./archive/fix_frontend_bugs_20260424/)_
      _Fix critical frontend bugs: mountedRef cleanup, duplicate query names, missing error handling, and incomplete implementations._

### Frontend E2E Fixes (2026-05-02) — COMPLETE

- [x] **Track: Frontend E2E Fixes**
      _Link: [./tracks/frontend_e2e_fixes_20260502/](./tracks/frontend_e2e_fixes_20260502/)_
      _Fix broken frontend functions (PipelinesPage dead state, OpsPage duplicates), add missing unit tests for hooks and pages, verify e2e coverage. All 277 frontend unit tests pass, type check + lint clean._

### Tech Debt Fixes (2026-04-25)

- [x] **Track: Fix YAML Safe Schema (TD-031)**
      _Link: [./archive/fix_yaml_safe_schema_20260425/](./archive/fix_yaml_safe_schema_20260425/)_
      _Replace bare yaml.load() calls with safe schema across 6 call sites to eliminate arbitrary JS deserialization risk._

### E2E Test Fixes (2026-05-03)

- [x] **Track: Fix Failing E2E Tests**
      _Link: [./tracks/fix_failing_e2e_20260503/](./tracks/fix_failing_e2e_20260503/)_
      _Fix three failing e2e tests for Pipelines and Project View pages to ensure core functionality works correctly._

### Quality Remediation (2026-05-03)

- [x] **Track: Quality Remediation — 2026-05-02/03 Audit**
      _Link: [./tracks/remediation_20260503_audit/](./tracks/remediation_20260503_audit/)_
      _Fixed several systematic quality failures found in 24-hour audit: fake analytics tests, weakened e2e assertions, untested Convex query logic, hardcoded backfill model. Follow-up review found remaining incomplete verification and implementation mismatches now tracked in Review Remediation._

- [x] **Track: Review Remediation — 2026-05-03**
      _Link: [./tracks/review_remediation_20260503/](./tracks/review_remediation_20260503/)_
      _Remediated post-review findings: Symphony retry/hook wiring, analytics filter no-ops, cost-per-task denominator bug, and overstated completion/verification claims. Focused tests and type/check commands pass; broad pivot/frontend baseline failures remain documented._

---

## Recently Archived (2026-04-15 cleanup)

- [x] **Track: Foundational Fixes** — [./archive/foundational_fixes_20260501/](./archive/foundational_fixes_20260501/)
- [x] **Track: Test Coverage Dashboard (Bun + Convex)** — [./archive/test_coverage_dashboard_bun_convex_20260411/](./archive/test_coverage_dashboard_bun_convex_20260411/)
- [x] **Track: Fix Coverage Query Performance (TD-015, TD-016)** — [./archive/fix_coverage_query_performance_20260415/](./archive/fix_coverage_query_performance_20260415/)
- [x] **Track: Self-Healing Workflows** — [./archive/self_healing_workflows_20260405/](./archive/self_healing_workflows_20260405/)
- [x] **Track: Continuous Orchestration Mode** — [./archive/continuous_orchestration_20260405/](./archive/continuous_orchestration_20260405/)
- [x] **Track: Fix Stats Type Errors** — [./archive/fix_stats_type_errors_20260409/](./archive/fix_stats_type_errors_20260409/)
- [x] **Track: Git Integration (Bun)** — [./archive/git_integration_20260409/](./archive/git_integration_20260409/)
- [x] **Track: Fix Git Orchestrator Bugs** — [./archive/fix_git_orchestrator_bugs_20260411/](./archive/fix_git_orchestrator_bugs_20260411/)

---

## Roadmap

Sequenced phases that build Fleet Commander into a complete autonomous development team. Phases 1-5 have full track documentation (spec + plan). Phases 6-7 are outlined. Phases 8-10 have full track documentation (spec + plan).

### Phase 1 — Core Engine

_(All tracks archived)_

### Phase 2 — Data Layer & Reliability

_(All tracks archived)_

### Phase 3 — Sprint Planning & Project Management

_(All tracks archived)_

### Phase 4 — Code Review & Quality

- [x] **Track: Automated Code Review Pipeline**
      _Link: [./archive/automated_review_pipeline_20260330/](./archive/automated_review_pipeline_20260330/)_
      _Foundation for tracks 14-16._

- [x] **Track: Multi-Agent Code Review**
      _Link: [./tracks/multiagent_code_review_20260330/](./tracks/multiagent_code_review_20260330/)_

- [x] **Track: Fix stats.ts Type Errors**
      _Link: [./tracks/fix_stats_type_errors_20260409/](./tracks/fix_stats_type_errors_20260409/)_
      _Fixed type mismatches: 'completed'→'succeeded' in getAgentStats, 'blocked'→'triaged' in getIssueStats. Frontend build and tests pass._

- [x] **Track: Test Coverage Dashboard**
      _Link: [./archive/test_coverage_dashboard_20260330/](./archive/test_coverage_dashboard_20260330/)_

- [x] **Track: Static Analysis Integration**
      _Link: [./archive/static_analysis_integration_20260330/](./archive/static_analysis_integration_20260330/)_

### Phase 5 — CI/CD & Deployment — ALL COMPLETE

### Phase 6 — Analytics & Intelligence

- [x] **Track: Execution Analytics Dashboard**
      _Link: [./tracks/execution_analytics_20260502/](./tracks/execution_analytics_20260502/)_
      _Rich analytics: completion trends, agent utilization heatmap, bottleneck ID, queue depth over time. Phases 1-4 complete; deferred: e2e filter tests (TD-034), perf benchmark (TD-035), hook failure markers (TD-036)._

- [x] **Track: Cost Tracking & Budget Management**
      _Link: [./tracks/cost_tracking_20260502/](./tracks/cost_tracking_20260502/)_
      _LLM API costs per agent/project/sprint, budget alerts, cost-per-task metrics._

- [~] **Track: Performance Profiling**
      _Link: [./tracks/performance_profiling_20260502/](./tracks/performance_profiling_20260502/)_
      _Execution time breakdown, slow agent detection, regression tracking._

- [x] **Track: AI Retrospective Engine**
      _Link: [./tracks/ai_retrospective_20260502/](./tracks/ai_retrospective_20260502/)_
      _End-of-sprint AI analysis: patterns, blockers, improvement suggestions. All phases complete; optional webhook wiring deferred to `notification_system_20260502`._

### Phase 7 — Team Scaling & Multi-tenancy

- [ ] **Track: Workload Balancer**
      _Link: [./tracks/workload_balancer_20260502/](./tracks/workload_balancer_20260502/)_
      _Distribute tasks by workload, expertise, availability._

- [ ] **Track: Agent Persona Marketplace**
      _Link: [./tracks/agent_marketplace_20260502/](./tracks/agent_marketplace_20260502/)_
      _Browse, install, share agent definitions._

- [ ] **Track: Multi-User Collaboration**
      _Link: [./tracks/multi_user_20260502/](./tracks/multi_user_20260502/)_
      _Shared daemon, presence, conflict resolution, RBAC._

- [ ] **Track: Notification & Alerting System**
      _Link: [./tracks/notification_system_20260502/](./tracks/notification_system_20260502/)_
      _Configurable alerts via desktop/email/webhook._

### Phase 8 — Autonomous Operations

- [ ] **Track: Continuous Orchestration Mode** — Auto-run on interval, queue management, idle detection, graceful shutdown.
      _Link: [./tracks/continuous_orchestration_20260502/](./tracks/continuous_orchestration_20260502/)_
- [ ] **Track: Self-Healing Workflows** — Stalled agent detection, auto-retry with backoff, circuit breaker auto-reset, automatic issue creation.
      _Link: [./tracks/self_healing_20260502/](./tracks/self_healing_20260502/)_
- [ ] **Track: Adaptive Dispatching** — Outcome correlation analysis, weight adjustment proposals, anomaly detection.
      _Link: [./tracks/adaptive_dispatching_20260502/](./tracks/adaptive_dispatching_20260502/)_
- [ ] **Track: Autonomous Backlog Grooming** — Staleness detection, duplicate detection, dependency-based auto-prioritization.
      _Link: [./tracks/backlog_grooming_20260502/](./tracks/backlog_grooming_20260502/)_

### Phase 9 — Developer Experience

- [ ] **Track: Keyboard Shortcuts & Command Palette** — Cmd+K command palette, full keyboard nav, customizable bindings, cheat sheet.
      _Link: [./tracks/keyboard_shortcuts_20260502/](./tracks/keyboard_shortcuts_20260502/)_
- [ ] **Track: Project Templates & Scaffolding** — Pre-built templates, one-click creation, custom template export.
      _Link: [./tracks/project_templates_20260502/](./tracks/project_templates_20260502/)_
- [ ] **Track: Mobile-Responsive Dashboard** — Responsive breakpoints, touch interactions, mobile-optimized data loading.
      _Link: [./tracks/mobile_responsive_20260502/](./tracks/mobile_responsive_20260502/)_
- [ ] **Track: Plugin System** — Plugin API, hot-loading, example plugins (Slack, Jira, Reports).
      _Link: [./tracks/plugin_system_20260502/](./tracks/plugin_system_20260502/)_

### Phase 10 — Enterprise & Hardening

- [ ] **Track: Authentication & Authorization** — API keys, Convex Auth, RBAC, audit log, session management.
      _Link: [./tracks/auth_authorization_20260502/](./tracks/auth_authorization_20260502/)_
- [ ] **Track: Encrypted Storage** — AES-256-GCM field encryption, OS keychain, key rotation, encrypted backups.
      _Link: [./tracks/encrypted_storage_20260502/](./tracks/encrypted_storage_20260502/)_
- [ ] **Track: Observability & Telemetry** — Prometheus metrics, OpenTelemetry tracing, health checks, dashboard templates.
      _Link: [./tracks/observability_telemetry_20260502/](./tracks/observability_telemetry_20260502/)_
- [ ] **Track: API Documentation & OpenAPI** — Auto-generated spec, Swagger UI, SDK generation, API versioning.
      _Link: [./tracks/api_documentation_20260502/](./tracks/api_documentation_20260502/)_

---

## Archived Tracks

- [x] **Track: Frontend Migration to Convex-Backed Data Flows**
      _Link: [./archive/frontend_convex_migration_20260402/](./archive/frontend_convex_migration_20260402/)_
      _Ports the existing `frontend/` app to Convex-backed hooks/subscriptions instead of legacy runtime adapters._

- [x] **Track: Strategic Platform Pivot — Bun + Convex**
      _Link: [./archive/platform_pivot_bun_convex_20260401/](./archive/platform_pivot_bun_convex_20260401/)_
      _Staged rewrite to Bun + Convex. Full Go runtime decommission deferred until additional parity slices are migrated._

- [x] **Track: Dependency Graph & Critical Path**
      _Link: [./archive/dependency_graph_20260330/](./archive/dependency_graph_20260330/)_

- [x] **Track: Modular Code Refactoring**
      _Link: [./archive/modular_code_refactoring_20260331/](./archive/modular_code_refactoring_20260331/)_

- [x] **Track: Issue Tracking Frontend**
      _Link: [./archive/issue_tracking_frontend_20260329/](./archive/issue_tracking_frontend_20260329/)_

- [x] **Track: Execution Logging Endpoints & Hooks**
      _Link: [./archive/execution_logging_endpoints_20260329/](./archive/execution_logging_endpoints_20260329/)_

- [x] **Track: Issue Tracking & Communication**
      _Link: [./archive/issue_tracking_communication_20260329/](./archive/issue_tracking_communication_20260329/)_

- [x] **Track: Execution Logging**
      _Link: [./archive/execution_logging_20260329/](./archive/execution_logging_20260329/)_

- [x] **Track: Orchestrator Completion Feedback Loop**
      _Link: [./archive/orchestrator_completion_loop_20260330/](./archive/orchestrator_completion_loop_20260330/)_

- [x] **Track: Settings & Configuration Page**
      _Link: [./archive/settings_config_page_20260330/](./archive/settings_config_page_20260330/)_

- [x] **Track: Agent Issue Auto-Creation**
      _Link: [./archive/agent_issue_autocreation_20260330/](./archive/agent_issue_autocreation_20260330/)_

- [x] **Track: SQLite Database Migration**
      _Link: [./archive/sqlite_database_migration_20260330/](./archive/sqlite_database_migration_20260330/)_

- [x] **Track: Database Query Layer for Dashboard**
      _Link: [./archive/database_query_layer_20260330/](./archive/database_query_layer_20260330/)_

- [x] **Track: Automated Backup & Restore**
      _Link: [./archive/automated_backup_restore_20260330/](./archive/automated_backup_restore_20260330/)_

- [x] **Track: Error Recovery & Resilience**
      _Link: [./archive/error_recovery_resilience_20260330/](./archive/error_recovery_resilience_20260330/)_

- [x] **Track: Sprint Management**
      _Link: [./archive/sprint_management_20260330/](./archive/sprint_management_20260330/)_

- [x] **Track: AI Sprint Planner**
      _Link: [./archive/ai_sprint_planner_20260330/](./archive/ai_sprint_planner_20260330/)_

- [x] **Track: Task Estimation & Complexity Scoring**
      _Link: [./archive/task_estimation_scoring_20260330/](./archive/task_estimation_scoring_20260330/)_

- [x] **Track: Cleanup Agent/Harness Integration**
      _Link: [./archive/chore_cleanup_agent_harness_20260329/](./archive/chore_cleanup_agent_harness_20260329/)_

- [x] **Track: SQLite Storage Layer**
      _Link: [./archive/sqlite_storage_20260329/](./archive/sqlite_storage_20260329/)_

- [x] **Track: LLM Dispatcher (Prioritization Engine)**
      _Link: [./archive/llm_dispatcher_prioritization_20260329/](./archive/llm_dispatcher_prioritization_20260329/)_

- [x] **Track: Agent Registry UI**
      _Link: [./archive/agent_registry_ui_20260329/](./archive/agent_registry_ui_20260329/)_

- [x] **Track: Orchestrator-Harness Integration & Deduplication**
      _Link: [./archive/chore_orchestrator_harness_integration_20260329/](./archive/chore_orchestrator_harness_integration_20260329/)_

- [x] **Track: Go Backend - CLI Runner & WebSocket Streaming**
      _Link: [./archive/go_cli_runner_websocket_streaming_20260325/](./archive/go_cli_runner_websocket_streaming_20260325/)_

- [x] **Track: Frontend - Global Dashboard & Onboarding**
      _Link: [./archive/frontend_global_dashboard_onboarding_20260325/](./archive/frontend_global_dashboard_onboarding_20260325/)_

- [x] **Track: Go Backend - Orchestrator Engine & Priorities**
      _Link: [./archive/go_orchestrator_engine_priorities_20260325/](./archive/go_orchestrator_engine_priorities_20260325/)_

- [x] **Track: Go Backend - Workspace Auto-Discovery & Persistence**
      _Link: [./archive/go_workspace_discovery_persistence_20260325/](./archive/go_workspace_discovery_persistence_20260325/)_

- [x] **Track: CLI Process Manager & Execution Engine**
      _Link: [./archive/cli_process_manager_20260324/](./archive/cli_process_manager_20260324/)_

- [x] **Track: Agent & Harness Management UI**
      _Link: [./archive/agent_harness_management_ui_20260327/](./archive/agent_harness_management_ui_20260327/)_

- [x] **Track: Frontend - Project Kanban Board**
      _Link: [./archive/frontend_project_kanban_board_20260325/](./archive/frontend_project_kanban_board_20260325/)_

- [x] **Track: Core Go File Watcher & Markdown Parser Engine**
      _Link: [./archive/go_file_watcher_parser_20260324/](./archive/go_file_watcher_parser_20260324/)_

- [x] **Track: Daily Refactor & Cleanup**
      _Link: [./archive/daily_refactor_20260324/](./archive/daily_refactor_20260324/)_

- [x] **Track: Scaffold Go Backend Daemon & Vite Frontend**
      _Link: [./archive/scaffold_go_vite_daemon_20260324/](./archive/scaffold_go_vite_daemon_20260324/)_

_(Legacy Electron/React implementation tracks superseded):_

- [x] **Track: Information Architecture Refactor (Superseded)**
      _Link: [./archive/ux_information_architecture_20260314_superseded/](./archive/ux_information_architecture_20260314_superseded/)_

- [x] **Track: Interaction Improvements (Superseded)**
      _Link: [./archive/ux_interaction_improvements_20260314_superseded/](./archive/ux_interaction_improvements_20260314_superseded/)_

- [x] **Track: Keyboard Shortcuts & Application Menus (Superseded)**
      _Link: [./archive/ux_keyboard_menus_20260314_superseded/](./archive/ux_keyboard_menus_20260314_superseded/)_

- [x] **Track: Empty States & Onboarding (Superseded)**
      _Link: [./archive/ux_empty_states_onboarding_20260314_superseded/](./archive/ux_empty_states_onboarding_20260314_superseded/)_

## All Tracks Tracked

Phase 6-10 tracks now have full spec + plan + metadata. See above sections.

- [x] **Track: Visual Refresh: Define Unique Identity**
      _Link: [./archive/visual_refresh_20260425/](./archive/visual_refresh_20260425/)_
      _Defined "Tactical Ledger" visual identity: black background, international orange/cyber cyan accents, 0px radius, monospaced data. Refactored core UI components._
- [x] **Track: Symphony Pivot**
      _Link: [./tracks/symphony_pivot_20260503/](./tracks/symphony_pivot_20260503/)_
      _Symphony-compatible features: Postgres local backend, Opencode persistent sessions, lifecycle hooks, exponential backoff, Measure metadata tags._
