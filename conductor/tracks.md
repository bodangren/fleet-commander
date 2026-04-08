# Tracks Registry — Fleet Commander Operational Dashboard

## Project Vision

Fleet Commander is a **local-first autonomous development team** built around a Bun local runtime and Convex as canonical state. The goal is a fully operational, self-directed development team modeled after strong engineering practices: sprint planning, intelligent task dispatch, automated testing, code review, CI/CD, and retrospective analysis.

---

## Active Tracks

_(none)_

---

## Completed (Not Yet Archived)

- [x] **Track: E2E Testing**
      _Link: [./archive/e2e_testing_20260408/](./archive/e2e_testing_20260408/)_
      _Add Playwright e2e tests for frontend-backend integration. Playwright installed, config written, 4 test suites covering dashboard/project/agents/harnesses pages. 10 tests pass (agents navigation, harness navigation, dashboard overview/stats/live output). 10 tests require backend on :8081 to be running._

---

## Completed (Not Yet Archived)

- [x] **Track: Self-Healing Workflows**
      _Link: [./tracks/self_healing_workflows_20260405/](./tracks/self_healing_workflows_20260405/)_
      _All 5 phases complete: recoveryLog and circuitBreakers Convex tables, StalledTaskDetector, RetryManager, CircuitBreaker state machine, RecoveryDispatcher, HealthCheckLoop, health endpoint, manual override routes. Circuit breaker wired into dispatch flow. 186 tests pass, typecheck clean._

- [x] **Track: Continuous Orchestration Mode**
      _Link: [./tracks/continuous_orchestration_20260405/](./tracks/continuous_orchestration_20260405/)_
      _Phase 1-4 complete: ContinuousModeManager, Convex mutations/queries, orchestrator routes (status/pause/resume/enable/disable/interval), idle detection, task queue with priority ordering, concurrency limiter, auto-pause handler. 48 new tests, 147 total pass, typecheck clean._

---

## Completed (Not Yet Archived)

- [x] **Track: Fix Remaining Tech Debt (TD-010, TD-011, TD-012)**
      _Link: [./archive/fix_remaining_tech_debt_20260405/](./archive/fix_remaining_tech_debt_20260405/)_
      _Replaced 102 `as never` casts with generated Convex API references across all route handlers and orchestrator modules. Fixed conditional hook calls in useLogStream.ts. Fixed missing useEffect dependencies in useModelDiscovery. 82 pivot + 29 frontend tests pass, lint + build clean._

- [x] **Track: Daily Cleanup 2026-04-05**
      _Link: [./archive/chore_daily_cleanup_20260405/](./archive/chore_daily_cleanup_20260405/)_
      _Fixed 30 TypeScript errors in pivot tests/routes, removed dead code (broadcastAll), cleaned stale Electron IPC types, fixed misleading Go comments, removed debug console.log, organized migration/demo scripts. 82 pivot tests + 29 frontend tests pass, lint + build clean._

- [x] **Track: Fix Open Tech Debt (TD-005 to TD-008)**
      _Link: [./tracks/fix_open_tech_debt_20260404/](./tracks/fix_open_tech_debt_20260404/)_
      _Fixed TD-005 (multiline issues verified), TD-006 (zero settings verified), TD-007 (review lookup returns latest), TD-008 (review hooks wired). 13 new tests added, 82 tests pass._

- [x] **Track: Fix Critical Orchestrator Bugs**
      _Link: [./archive/fix_critical_orchestrator_bugs_20260404/](./archive/fix_critical_orchestrator_bugs_20260404/)_
      _Fixed TD-003 (issue hooks wiring) and TD-004 (dependency evaluator state preservation). 7 new tests added, 69 tests pass._

- [x] **Track: Daily Cleanup 2026-04-04**
      _Link: [./archive/chore_daily_cleanup_20260404/](./archive/chore_daily_cleanup_20260404/)_
      _Fixed duplicate imports/calls, removed 23 ESLint errors, extracted shared pipeline utilities, cleaned stale Go references._

- [x] **Track: Pipeline Definition & Runner**
      _Link: [./archive/pipeline_runner_20260330/](./archive/pipeline_runner_20260330/)_
      _CI/CD-style pipeline system with YAML schema, Bun runner engine, Convex storage, API endpoints, and dashboard components._

- [x] **Track: Multi-Agent Code Review**
      _Link: [./archive/multiagent_code_review_20260330/](./archive/multiagent_code_review_20260330/)_
      _Phase 5 verified — review dispatcher, prompt builder, sub-task creation, and dashboard component complete._

- [x] **Track: Multi-Agent Code Review**
      _Link: [./archive/multiagent_code_review_20260330/](./archive/multiagent_code_review_20260330/)_
      _Phase 5 verified — review dispatcher, prompt builder, sub-task creation, and dashboard component complete._

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

- [ ] **Track: Test Coverage Dashboard**
      _Link: [./tracks/test_coverage_dashboard_20260330/](./tracks/test_coverage_dashboard_20260330/)_

- [ ] **Track: Static Analysis Integration**
      _Link: [./tracks/static_analysis_integration_20260330/](./tracks/static_analysis_integration_20260330/)_

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
