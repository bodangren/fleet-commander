# Tracks Registry — Fleet Commander

## Project Vision

Fleet Commander is a **virtual software house**. You run a company of AI agents who work on projects through budget-constrained sprints. Money is the scarce resource, not time.

---

## Pending Tracks

### Phase 1 — Foundation

- [x] **Track: Foundation Layer**
      _Link: [./archive/foundation_layer_20260517/](./archive/foundation_layer_20260517/)_
      _Convex schema, agent system, cost profiles, and basic CRUD operations._

- [x] **Track: Pipeline Engine**
      _Link: [./archive/pipeline_engine_20260517/](./archive/pipeline_engine_20260517/)_
      _5-stage pipeline execution engine with agent role assignment and cost tracking._

### Phase 2 — Core Features

- [x] **Track: Sprint Planning**
      _Link: [./archive/sprint_planning_20260517/](./archive/sprint_planning_20260517/)_
      _Budget-based sprint planning with PM agent recommendations and cost estimation._

- [x] **Track: Kanban Board**
      _Link: [./archive/kanban_board_20260517/](./archive/kanban_board_20260517/)_
      _Kanban board with cost-based columns, budget tracking, and drag-and-drop._

- [x] **Track: Task Timeline**
      _Link: [./archive/task_timeline_20260517/](./archive/task_timeline_20260517/)_
      _5-stage pipeline visualization for individual tasks with agent chain and execution logs._

### Phase 3 — Overview

- [x] **Track: Dashboard**
      _Link: [./archive/dashboard_20260517/](./archive/dashboard_20260517/)_
      _Morning standup dashboard with current sprint status, key metrics, and attention items._

### Phase 4 — Insights

- [x] **Track: Insights**
      _Link: [./archive/insights_20260517/](./archive/insights_20260517/)_
      _Analytics, performance, and cost insights with sprint velocity and agent reliability._

### Phase 5 — Operations

- [x] **Track: Operations**
      _Link: [./archive/operations_20260517/](./archive/operations_20260517/)_
      _Monitor, Diagnose, and Optimize operations with A/B testing and policy tuning. Committed: b38f53c_

### Phase 6 — History

- [x] **Track: History**
      _Link: [./archive/history_20260517/](./archive/history_20260517/)_
      _Sprint, agent, and task history with performance trends and model change tracking._

### Phase 7 — Polish

- [x] **Track: E2E Audit Remediation**
      _Link: [./archive/e2e_audit_remediation_20260603/](./archive/e2e_audit_remediation_20260603/)_
      _Fix all 29 findings from the 2026-06-03 full E2E audit: 10 P0 app-breaking bugs, 8 P1 workflow-blocking issues, and 11 P2 polish items._

---

## Active Tracks

- [x] **Track: Quality Workflow Production Hardening**
      _Link: [./tracks/quality_workflow_production_hardening_20260612/](./tracks/quality_workflow_production_hardening_20260612/)_
      _Fix production gaps, stubs, security holes, and weak tests left by the quality-workflow integration and RR7 migration: wire real quality hooks, remove fake runners, harden Convex handlers and REST routes, fix WAL/resume/idempotency, and restore project-wide gates._

- [x] **Track: Graph Node Audit Remediation**
      _Link: [./archive/graph_node_audit_remediation_20260602/](./archive/graph_node_audit_remediation_20260602/)_
      _Risk-ordered remediation plan for the graph-node audit: public stubs/auth/data bugs first, then wire-or-delete dead code, duplicate implementation cleanup, boundary contracts, god-file splits, and graph-backed guardrails._

- [x] **Track: God-File Splits and Test-Coverage Closure**
      _Link: [./archive/godfile_splits_and_test_coverage_20260603/](./archive/godfile_splits_and_test_coverage_20260603/)_
      _Split god-files (runProject, useConvexData, useConvexRealtime) behind characterization tests and close test coverage gaps on pivot routes, frontend hooks, and Convex handlers._

- [x] **Track: Graph Node Audit Secondary Remediation**
      _Link: [./archive/graph_node_audit_secondary_remediation_20260602/](./archive/graph_node_audit_secondary_remediation_20260602/)_
      _Below-Top-25 graph-node audit remediation grouped for leverage: shared frontend utilities, direct-fetch and fixture drift, pivot reliability/script hygiene, Convex bounded-query cleanup, and secondary test/doc closure._

- [x] **Track: Review Remediation — Four Recent Tracks**
      _Link: [./archive/review_remediation_20260529/](./archive/review_remediation_20260529/)_
      _Fix P0–P2 bugs from cross-track review: portfolio health dead-code paths, template delete bypass, similarity truncation, retrospective query divergence, missing spec fields, and zero frontend test coverage._

- [x] **Track: Agent A/B Testing Framework**
      _Link: [./archive/agent_ab_testing_framework_20260527/](./archive/agent_ab_testing_framework_20260527/)_
      _Compare two agent configurations on identical tasks with cost, duration, and quality metrics._

- [x] **Track: Custom Agent Templates**
      _Link: [./archive/custom_agent_templates_20260527/](./archive/custom_agent_templates_20260527/)_
      _Allow users to create, edit, and clone custom agent personas with models, skills, and cost profiles._

- [x] **Track: Multi-Project Portfolio View**
      _Link: [./archive/multi_project_portfolio_20260527/](./archive/multi_project_portfolio_20260527/)_
      _Fleet-wide project health dashboard with RAG indicators and quick actions._

- [x] **Track: Sprint Retrospective Dashboard**
      _Link: [./archive/sprint_retrospective_dashboard_20260527/](./archive/sprint_retrospective_dashboard_20260527/)_
      _Post-sprint retrospective with budget burndown, agent performance, rejection analysis, and auto-insights._

---

## Upcoming Tracks

- [x] **Track: Budget Burn Forecasting**
      _Link: [./archive/budget_burn_forecasting_20260530/](./archive/budget_burn_forecasting_20260530/)_
      _Real-time budget burn forecast with projected exhaustion time, at-risk alerts, and task reprioritization recommendations._

- [x] **Track: Agent Performance Leaderboard**
      _Link: [./archive/agent_performance_leaderboard_20260530/](./archive/agent_performance_leaderboard_20260530/)_
      _Persistent cross-project agent rankings by composite performance score with trend indicators and drill-down analytics._

- [x] **Track: Smart Model Router**
      _Link: [./archive/smart_model_router_20260530/](./archive/smart_model_router_20260530/)_
      _Automatic model selection per task based on cost-quality tradeoff policy, historical performance, and fallback chains._

- [x] **Track: Pipeline Unification & Scheduler Hardening**
      _Link: [./archive/pipeline_unification_scheduler_20260605/](./archive/pipeline_unification_scheduler_20260605/)_
      _Unify parallel execution pipelines, fix race conditions in async intervals, and implement reconciliation auto-repair for stuck tasks and orphan sprints. Committed: f395b11, a09e1dd._


---

## Planned — 2026-06-05 Review Output

_Created from the 2026-06-05 review session. The first is remediation of bugs/debt found this session; the rest are architecture/design improvements targeting the structural root causes (god-files, status drift, untyped Convex boundary, unenforced gates)._

- [ ] **Track: Orchestrator God-Function Decomposition**
      _Link: [./tracks/orchestrator_decomposition_20260605/](./tracks/orchestrator_decomposition_20260605/)_
      _Decompose the 1034-line `runProject` god-function (TD-206) behind characterization tests into a thin orchestration shell over testable stage modules; the last big god-file._

## Archived/Completed — 2026-06-05 Review Output

- [x] **Track: Review Remediation — Quality-Gate Green-Up**
      _Link: [./archive/review_remediation_20260605/](./archive/review_remediation_20260605/)_
      _Fix the cross-cutting bugs/debt found in review and restore an all-green gate: latent insights/projects type bugs (TD-237), dashboard test failures (TD-239), and the non-functional as-any guard (TD-236). Coordinates TD-235/TD-238 which are owned by feature tracks._

- [x] **Track: Status & Enum Source-of-Truth Unification**
      _Link: [./archive/status_vocabulary_unification_20260605/](./archive/status_vocabulary_unification_20260605/)_
      _Make every status/enum vocabulary a single exported validator with derived TS type + display map, resolve the `providers.status` overload (TD-235), and guard against new inline status unions (`schema_status_drift`)._

- [x] **Track: Typed Convex API Boundary**
      _Link: [./archive/typed_convex_boundary_20260605/](./archive/typed_convex_boundary_20260605/)_
      _Migrate string-based Convex calls onto the typed `api.*` path, delete the matching `as any` casts (root cause of the 191-cast as-any debt), and tighten the as-any allowlist's Convex escape-hatch globs._

- [x] **Track: Quality-Gate Enforcement & Dead-Code Sweep**
      _Link: [./archive/quality_gate_enforcement_20260605/](./archive/quality_gate_enforcement_20260605/)_
      _Add a single `verify` gate (all suites + typecheck + doctor) with a pre-push/CI hook and a Measure closeout rule, plus a build-graph orphan report to wire-or-delete dead code (TD-209, TD-213, the SaveAsTemplateModal orphan class)._

- [x] **Track: Provider Health Monitor & Resilience**
      _Link: [./archive/provider_health_resilience_20260605/](./archive/provider_health_resilience_20260605/)_
      _Real-time LLM provider health probes, status dashboard, automatic fallback chains when providers fail, and Convex client consolidation._

- [x] **Track: Task Dependencies & Critical Path**
      _Link: [./archive/task_dependencies_critical_path_20260605/](./archive/task_dependencies_critical_path_20260605/)_
      _Complete the dependency system with cycle-safe mutations, dependency editing UI, fixed critical path algorithm, dependency-aware sprint planning, and a dedicated Blockers dashboard._

- [x] **Track: Project Template Marketplace**
      _Link: [./archive/project_template_marketplace_20260530/](./archive/project_template_marketplace_20260530/)_
      _Create projects from pre-built templates with initial tasks, default agents, and budget recommendations. Save existing projects as custom templates._

---

## Planned — 2026-06-07 Package Maintenance

- [ ] **Track: Package Dependency Upgrades & Security Remediation**
      _Link: [./tracks/package_dependency_upgrades_20260607/](./tracks/package_dependency_upgrades_20260607/)_
      _Upgrade compatible Bun workspace dependencies, remediate the 14-finding package audit, and evaluate breaking major upgrades as isolated, verified batches._

## Planned — 2026-06-09 Import Pipeline

- [x] **Track: Project Import, Sprint Creation & AI Story Generation**
      _Link: [./archive/project_import_pipeline_20260609/](./archive/project_import_pipeline_20260609/)_
      _Make workspace import real and reachable (tracks + tasks, idempotent), add UI sprint/track creation, and AI story generation with preview-then-commit._

## Planned — 2026-06-10 Settings Refactor

- [ ] **Track: Settings Page Refactor and Notification Preferences**
      _Link: [./tracks/settings_page_refactor_20260610/](./tracks/settings_page_refactor_20260610/)_
      _Decompose SettingsPage.tsx god-file into focused sub-pages, fix notification preference source-of-truth race (TD-216), and add persistent notification settings backed by Convex._

## Planned — 2026-06-11 Router Migration

_(all tracks archived)_

## Planned — 2026-06-11 Quality Workflow Integration

- [ ] **Track: Configurable Measure-Quality Workflow Integration**
      _Link: [./tracks/measure_quality_workflow_integration_20260611/](./tracks/measure_quality_workflow_integration_20260611/)_
      _Integrate configurable Red/Green, independent audit, verification, and Measure closeout workflows into the canonical production orchestrator while preserving app-owned scheduling, persistence, budgets, recovery, Git lifecycle, and visibility._

## Completed — 2026-06-11 Review Remediation (36h Audit)

- [x] **Track: Review Remediation — 36h Orchestrator + Notifications + Budgets Audit** _(retroactive)_
      _Link: [./archive/review_remediation_36h_20260611/](./archive/review_remediation_36h_20260611/)_
      _Retroactive track for the 2026-06-11 review of the past 36h of commits (branch `fix/review-36h-orchestrator-notifications`): fix reviewer-without-merger task stuck in `review` (#1), wire the git lifecycle into the production AutoRunner hot path (#2), move budget governance to `reconcileBudgetReservation` off persisted `spent` (#3), harden `updateNotificationPreference` (#4), and trim measure docs + log TD-249 (#5). Commits f329df0, dda90b7, da5ef97, 6b25dfb, 89c845a, 11f6523, d2ff92b._

## Planned — 2026-06-09 Orchestrator Core Remediation

- [x] **Track: Orchestrator Core Remediation (Audit 2026-06-09)**
      _Link: [./archive/orchestrator_core_remediation_20260609/](./archive/orchestrator_core_remediation_20260609/)_
      _Fix the blind orchestrator (task-query stubs), unify task status vocabulary, implement the Executor→Reviewer→Merger pipeline, make budgets sprint-aware and concurrency-safe, and quarantine the legacy employees/runs scheduler._

## Completed — 2026-06-10 Orchestrator Core Hardening

- [x] **Track: Orchestrator Core Hardening (Audit 2026-06-10)** _(completed 2026-06-10)_
      _Link: [./archive/orchestrator_hardening_20260610/](./archive/orchestrator_hardening_20260610/)_
      _Closed the six execution holes surfaced by the 2026-06-10 architectural review: real cost reconciliation (#1), spec+plan context for agents (#2), squash-merge by the Merger stage (#3), token & cost telemetry (#4), atomic task claim (#5), and AutoRunner wired into server.ts (#6). Closed TD-209, TD-213, and TD-201. Pivot 1594/0 green, Convex 1362/0 green._

## Archived — 2026-06-11 Router Migration

- [x] **Track: React Router 7 Migration** _(completed 2026-06-12)_
      _Link: [./archive/react_router_7_migration_20260611/](./archive/react_router_7_migration_20260611/)_
      _Convert BrowserRouter + Route declarations to React Router 7 data-router API, remove future flags, and re-validate all 25 Playwright E2E specs (TD-241). Closed TD-241. Remaining 34 E2E failures are pre-existing baseline (TD-250)._
