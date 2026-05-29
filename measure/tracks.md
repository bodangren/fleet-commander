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


---

## Active Tracks

- [x] **Track: Critical Bug Bash**
      _Link: [./archive/bug_bash_20260524/](./archive/bug_bash_20260524/)_
      _Fix TD-139 (upsertTask no-op), TD-140 (WorkspaceScanner API mismatch), TD-146 (detectRegressions test assertion), TD-147 (orchestrator.timing mock pollution)._

- [x] **Track: Schema Modularization**
      _Link: [./archive/schema_modularization_20260524/](./archive/schema_modularization_20260524/)_
      _Break up monolithic `convex/schema.ts` (553 lines, ~30 tables) into per-domain modules under `convex/schema/`._

- [x] **Track: Type Deduplication**
      _Link: [./archive/type_deduplication_20260524/](./archive/type_deduplication_20260524/)_
      _Consolidate duplicate `TaskDoc`/`WorkRunDoc`/`OrchestratorErrorDoc` across `convex/lib/*.ts` and audit frontend `fleetTypes.ts` for drift against Convex generated types._

- [x] **Track: Code Audit Remediation**
      _Link: [./archive/code_audit_remediation_20260521/](./archive/code_audit_remediation_20260521/)_
      _Delete dead code, fix logic bugs (cost trend $0, stale schema refs, missing auth), wire 15 analytics/performance/cost components to Convex realtime, fix junk tests._

- [x] **Track: Convex Test Remediation**
      _Link: [./archive/convex_test_remediation_20260520/](./archive/convex_test_remediation_20260520/)_
      _Fix 17 failing Convex tests: auth mock missing, seedAgentsHandler bug, projectSlug filtering, mock ID mismatches, test data errors. 438 pass, 0 fail._

- [x] **Track: Realtime Data & Schema Index Audit**
      _Link: [./archive/realtime_data_20260520/](./archive/realtime_data_20260520/)_
      _Audit Convex schema indexes and wire all dashboard/live data queries to realtime subscriptions._

- [x] **Track: UI Redesign — Linear Design System**
      _Link: [./archive/ui_redesign_linear_20260518/](./archive/ui_redesign_linear_20260518/)_
      _Redesign Fleet Commander UI to match Linear design system and ui-mockups.html views._

- [x] **Track: Schema Unification**
      _Link: [./archive/schema_unification_20260519/](./archive/schema_unification_20260519/)_
      _Remove duplicate schema definitions and unify to foundation schema._

- [x] **Track: Tech Debt Audit & Memory Compaction**
      _Link: [./archive/tech_debt_audit_20260519/](./archive/tech_debt_audit_20260519/)_
      _Audit open tech debt for obsolescence, deduplicate, consolidate, and compact lessons-learned._

- [x] **Track: Agent A/B Testing Framework**
      _Link: [./tracks/agent_ab_testing_framework_20260527/](./tracks/agent_ab_testing_framework_20260527/)_
      _Compare two agent configurations on identical tasks with cost, duration, and quality metrics._

- [x] **Track: Custom Agent Templates**
      _Link: [./tracks/custom_agent_templates_20260527/](./tracks/custom_agent_templates_20260527/)_
      _Allow users to create, edit, and clone custom agent personas with models, skills, and cost profiles._

- [x] **Track: Multi-Project Portfolio View**
      _Link: [./tracks/multi_project_portfolio_20260527/](./tracks/multi_project_portfolio_20260527/)_
      _Fleet-wide project health dashboard with RAG indicators and quick actions._

---

## Upcoming Tracks
