# Tracks Registry — Fleet Commander Operational Dashboard

## Project Vision

Fleet Commander is a **local-first autonomous development team** built around a Bun local runtime and Convex as canonical state. The goal is a fully operational, self-directed development team modeled after strong engineering practices: sprint planning, intelligent task dispatch, automated testing, code review, CI/CD, and retrospective analysis.

---

## Active Tracks

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
      _Observability-only drift detection between Convex canonical + `conductor/` exports._

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
      _Link: [./tracks/e2e_task_timeline_20260424/](./tracks/e2e_task_timeline_20260424/)_
      _Add Playwright e2e test coverage for TaskTimelinePage, the only remaining untested frontend page._

### Tech Debt Fixes (2026-04-23)

- [x] **Track: Fix Hardcoded Harness Name in Rollup (TD-027)**
      _Link: [./archive/fix_hardcoded_harness_name_20260423/](./archive/fix_hardcoded_harness_name_20260423/)_
      _Add harnessName to runContracts schema; fix groupByHarness and identifyDirtyBuckets to use actual harness name instead of hardcoded 'opencode'._

### Frontend Bug Fixes (2026-04-24)

- [x] **Track: Fix Frontend Bugs**
      _Link: [./tracks/fix_frontend_bugs_20260424/](./tracks/fix_frontend_bugs_20260424/)_
      _Fix critical frontend bugs: mountedRef cleanup, duplicate query names, missing error handling, and incomplete implementations._

### Tech Debt Fixes (2026-04-25)

- [x] **Track: Fix YAML Safe Schema (TD-031)**
      _Link: [./archive/fix_yaml_safe_schema_20260425/](./archive/fix_yaml_safe_schema_20260425/)_
      _Replace bare yaml.load() calls with safe schema across 6 call sites to eliminate arbitrary JS deserialization risk._

---

## Recently Archived (2026-04-15 cleanup)

- [x] **Track: Test Coverage Dashboard (Bun + Convex)** — [./archive/test_coverage_dashboard_bun_convex_20260411/](./archive/test_coverage_dashboard_bun_convex_20260411/)
- [x] **Track: Fix Coverage Query Performance (TD-015, TD-016)** — [./archive/fix_coverage_query_performance_20260415/](./archive/fix_coverage_query_performance_20260415/)
- [x] **Track: Self-Healing Workflows** — [./archive/self_healing_workflows_20260405/](./archive/self_healing_workflows_20260405/)
- [x] **Track: Continuous Orchestration Mode** — [./archive/continuous_orchestration_20260405/](./archive/continuous_orchestration_20260405/)
- [x] **Track: Fix Stats Type Errors** — [./archive/fix_stats_type_errors_20260409/](./archive/fix_stats_type_errors_20260409/)
- [x] **Track: Git Integration (Bun)** — [./archive/git_integration_20260409/](./archive/git_integration_20260409/)
- [x] **Track: Fix Git Orchestrator Bugs** — [./archive/fix_git_orchestrator_bugs_20260411/](./archive/fix_git_orchestrator_bugs_20260411/)

---

## Roadmap

Sequenced phases that build Fleet Commander into a complete autonomous development team. Phases 1-5 have full track documentation (spec + plan). Phases 6-10 are outlined for future planning.

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

### Phase 5 — CI/CD & Deployment

- [ ] **Track: Pipeline Definition & Runner**
      _Link: [./tracks/pipeline_runner_20260330/](./tracks/pipeline_runner_20260330/)_

- [ ] **Track: Git Integration**
      _Link: [./tracks/git_integration_20260330/](./tracks/git_integration_20260330/)_

- [ ] **Track: Pull Request Automation**
      _Link: [./tracks/pr_automation_20260330/](./tracks/pr_automation_20260330/)_

- [ ] **Track: Environment Management**
      _Link: [./tracks/environment_management_20260330/](./tracks/environment_management_20260330/)_

### Phase 6 — Analytics & Intelligence _(planned)_

- [ ] **Track: Execution Analytics Dashboard** — Rich analytics: completion trends, agent utilization heatmap, bottleneck ID, queue depth over time.
- [ ] **Track: Cost Tracking & Budget Management** — LLM API costs per agent/project/sprint, budget alerts, cost-per-task metrics.
- [ ] **Track: Performance Profiling** — Execution time breakdown, slow agent detection, regression tracking.
- [ ] **Track: AI Retrospective Engine** — End-of-sprint AI analysis: patterns, blockers, improvement suggestions.

### Phase 7 — Team Scaling & Multi-tenancy _(planned)_

- [ ] **Track: Workload Balancer** — Distribute tasks by workload, expertise, availability.
- [ ] **Track: Agent Persona Marketplace** — Browse, install, share agent definitions.
- [ ] **Track: Multi-User Collaboration** — Shared daemon, presence, conflict resolution, RBAC.
- [ ] **Track: Notification & Alerting System** — Configurable alerts via desktop/email/webhook.

### Phase 8 — Autonomous Operations _(planned)_

- [ ] **Track: Continuous Orchestration Mode** — Auto-run on interval, queue management, idle detection.
- [ ] **Track: Self-Healing Workflows** — Stalled agent detection, auto-retry, circuit breakers.
- [ ] **Track: Adaptive Dispatching** — Learn from history, adjust scoring weights, anomaly detection.
- [ ] **Track: Autonomous Backlog Grooming** — Detect stale tasks, merge duplicates, decompose large items.

### Phase 9 — Developer Experience _(planned)_

- [ ] **Track: Keyboard Shortcuts & Command Palette** — Cmd+K, full keyboard nav, customizable bindings.
- [ ] **Track: Project Templates & Scaffolding** — Pre-built templates, one-click project creation.
- [ ] **Track: Mobile-Responsive Dashboard** — Responsive layout, touch-friendly kanban.
- [ ] **Track: Plugin System** — Plugin API, registry, hot-loading, example integrations.

### Phase 10 — Enterprise & Hardening _(planned)_

- [ ] **Track: Authentication & Authorization** — API keys, RBAC, audit log, sessions.
- [ ] **Track: Encrypted Storage** — At-rest encryption, OS keychain integration.
- [ ] **Track: Observability & Telemetry** — Prometheus, tracing, health checks, Grafana/Datadog.
- [ ] **Track: API Documentation & OpenAPI** — Auto-generated spec, Swagger UI, SDK generation.

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

## Upcoming Tracks

- [ ] **Track: Pipeline Definition & Runner** *Link: [./tracks/pipeline_runner_20260425/](./tracks/pipeline_runner_20260425/)*
- [ ] **Track: Git Integration Enhancement** *Link: [./tracks/git_integration_enhance_20260425/](./tracks/git_integration_enhance_20260425/)*
- [ ] **Track: Pull Request Automation v2** *Link: [./tracks/pr_automation_v2_20260425/](./tracks/pr_automation_v2_20260425/)*

- [~] [Visual Refresh: Define Unique Identity](tracks/visual_refresh_20260425/index.md)
