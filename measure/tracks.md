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

- [~] **Track: Graph Node Audit Remediation**
      _Link: [./tracks/graph_node_audit_remediation_20260602/](./tracks/graph_node_audit_remediation_20260602/)_
      _Risk-ordered remediation plan for the graph-node audit: public stubs/auth/data bugs first, then wire-or-delete dead code, duplicate implementation cleanup, boundary contracts, god-file splits, and graph-backed guardrails._

- [x] **Track: God-File Splits and Test-Coverage Closure**
      _Link: [./tracks/godfile_splits_and_test_coverage_20260603/](./tracks/godfile_splits_and_test_coverage_20260603/)_
      _Split god-files (runProject, useConvexData, useConvexRealtime) behind characterization tests and close test coverage gaps on pivot routes, frontend hooks, and Convex handlers._

- [ ] **Track: Graph Node Audit Secondary Remediation**
      _Link: [./tracks/graph_node_audit_secondary_remediation_20260602/](./tracks/graph_node_audit_secondary_remediation_20260602/)_
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

- [ ] **Track: Budget Burn Forecasting**
      _Link: [./tracks/budget_burn_forecasting_20260530/](./tracks/budget_burn_forecasting_20260530/)_
      _Real-time budget burn forecast with projected exhaustion time, at-risk alerts, and task reprioritization recommendations._

- [ ] **Track: Agent Performance Leaderboard**
      _Link: [./tracks/agent_performance_leaderboard_20260530/](./tracks/agent_performance_leaderboard_20260530/)_
      _Persistent cross-project agent rankings by composite performance score with trend indicators and drill-down analytics._

- [ ] **Track: Smart Model Router**
      _Link: [./tracks/smart_model_router_20260530/](./tracks/smart_model_router_20260530/)_
      _Automatic model selection per task based on cost-quality tradeoff policy, historical performance, and fallback chains._

- [ ] **Track: Project Template Marketplace**
      _Link: [./tracks/project_template_marketplace_20260530/](./tracks/project_template_marketplace_20260530/)_
      _Create projects from pre-built templates with initial tasks, default agents, and budget recommendations. Save existing projects as custom templates._
