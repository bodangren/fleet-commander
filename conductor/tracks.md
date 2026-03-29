# Tracks Registry — Fleet Commander Operational Dashboard

## Project Vision

Fleet Commander is a **local-first autonomous development team** — a Go daemon with a React dashboard that manages multiple software projects using AI agent personas dispatched through CLI harnesses. The goal is a fully operational, self-directed development team modeled after the best software engineering practices: sprint planning, intelligent task dispatch, automated testing, code review, CI/CD, and retrospective analysis.

---

## Active Tracks

_No active tracks — all completed work is archived below._

---

## Completed (Not Yet Archived)

These tracks have their work implemented in the codebase but still live in `tracks/`. Archive at next cleanup pass.

- [x] **Track: Issue Tracking Frontend**
      _Link: [./tracks/issue_tracking_frontend_20260329/](./tracks/issue_tracking_frontend_20260329/)_
      _Status: All components (IssueListView, IssueDetailView, IssueCreateModal, IssueCard) and API endpoints exist. No remaining work._

- [x] **Track: Execution Logging Endpoints & Hooks**
      _Link: [./tracks/execution_logging_endpoints_20260329/](./tracks/execution_logging_endpoints_20260329/)_
      _Status: Logger, API routes (list/stats/export), LogTimelineView, LogStatsView all exist. No remaining work._

- [x] **Track: Issue Tracking & Communication**
      _Link: [./tracks/issue_tracking_communication_20260329/](./tracks/issue_tracking_communication_20260329/)_
      _Status: Data model, CRUD endpoints, frontend components all built. Agent auto-issue-creation deferred._

- [x] **Track: Execution Logging**
      _Link: [./tracks/execution_logging_20260329/](./tracks/execution_logging_20260329/)_
      _Status: JSONL logger, daily rotation, 30-day retention, API routes, frontend views all built._

---

## Roadmap

Sequenced phases that build Fleet Commander into a complete autonomous development team. Phases 1-5 have full track documentation (spec + plan). Phases 6-10 are outlined for future planning.

### Phase 1 — Core Engine

Wire what's built but disconnected.

- [x] **Track: LLM Dispatcher Integration**
      _Link: [./tracks/llm_dispatcher_integration_20260330/](./tracks/llm_dispatcher_integration_20260330/)_
      _Priority: Must-do — `internal/dispatcher/` is implemented but routes aren't registered._

- [ ] **Track: Orchestrator Completion Feedback Loop**
      _Link: [./tracks/orchestrator_completion_loop_20260330/](./tracks/orchestrator_completion_loop_20260330/)_
      _Priority: Must-do — orchestrator marks tasks done immediately without waiting for completion._

- [ ] **Track: Settings & Configuration Page**
      _Link: [./tracks/settings_config_page_20260330/](./tracks/settings_config_page_20260330/)_

- [ ] **Track: Agent Issue Auto-Creation**
      _Link: [./tracks/agent_issue_autocreation_20260330/](./tracks/agent_issue_autocreation_20260330/)_

### Phase 2 — Data Layer & Reliability

- [ ] **Track: SQLite Database Migration**
      _Link: [./tracks/sqlite_database_migration_20260330/](./tracks/sqlite_database_migration_20260330/)_
      _Note: `internal/database/` schema + stores exist but aren't wired in._

- [ ] **Track: Database Query Layer for Dashboard**
      _Link: [./tracks/database_query_layer_20260330/](./tracks/database_query_layer_20260330/)_

- [ ] **Track: Automated Backup & Restore**
      _Link: [./tracks/automated_backup_restore_20260330/](./tracks/automated_backup_restore_20260330/)_

- [ ] **Track: Error Recovery & Resilience**
      _Link: [./tracks/error_recovery_resilience_20260330/](./tracks/error_recovery_resilience_20260330/)_

### Phase 3 — Sprint Planning & Project Management

- [ ] **Track: Sprint Management**
      _Link: [./tracks/sprint_management_20260330/](./tracks/sprint_management_20260330/)_

- [ ] **Track: AI Sprint Planner**
      _Link: [./tracks/ai_sprint_planner_20260330/](./tracks/ai_sprint_planner_20260330/)_

- [ ] **Track: Task Estimation & Complexity Scoring**
      _Link: [./tracks/task_estimation_scoring_20260330/](./tracks/task_estimation_scoring_20260330/)_

- [ ] **Track: Dependency Graph & Critical Path**
      _Link: [./tracks/dependency_graph_20260330/](./tracks/dependency_graph_20260330/)_

### Phase 4 — Code Review & Quality

- [ ] **Track: Automated Code Review Pipeline**
      _Link: [./tracks/automated_review_pipeline_20260330/](./tracks/automated_review_pipeline_20260330/)_
      _Foundation for tracks 14-16._

- [ ] **Track: Multi-Agent Code Review**
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
