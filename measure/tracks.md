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

- [x] **Track: Convex Test Trust Recovery** — **TD-263 (Critical)** _(completed 2026-08-09)_
      _Link: [./tracks/convex_test_trust_recovery_20260809/](./tracks/convex_test_trust_recovery_20260809/)_
      _Completed on clean-checkout commit `c3abeed7475ffd2098e2fe3b1b1a0c07f272c51c`: runtime 21/105, Bun Convex 35/957, frontend 173/1,260 (211.03s), Pivot 150 files/1,726, typechecks and frontend format/lint/tsc/build green. Chrome aggregate: 3 passed / 1 approval-gated skipped in 1.2m._
      _The 23 notification wrappers and frontend's 59 legacy React act warnings plus one duplicate-key warning are separately classified follow-up debt, not TD-263 failures. Employees/runs, scheduler, and unused UI/hook cleanup are deferred to TD-247. Graph evidence is 5,799 nodes / 8,104 edges / 701 files; audit timeout >90s remains issue #2. Follow-up debt: shared useFleetData bootstrap can make project controls wait on unrelated agents/harnesses; /api/projects was observed up to 13.1s. Bounded Factory acceptance remains approval-gated elsewhere._

- [x] **Track: Notification Authorization Recovery** — **TD-264 (P0 / Elevated)** _(completed 2026-08-09)_
      _Link: [./tracks/notification_authorization_recovery_20260809/](./tracks/notification_authorization_recovery_20260809/)_
      _Completed in `fe2a5bb3`, `a03f2229`, and `63d34aac`: retired the public API, fake/external delivery, Pivot/frontend surfaces, emitters, 23 weak-wrapper warnings, and stale notification allowlist entries. Clean archive gates passed (runtime 21/105, Convex 31/922, Pivot 148/1,709, frontend 172/1,252); system Chrome passed 3/3. Alerts, task history/state, and logs remain operator truth. Historical tables remain non-addressable under TD-265; no credentialed factory mutation ran._

- [~] **Track: Notification Data Disposition** — **TD-265 (High / Critical schema risk)**
      _Link: [./tracks/notification_data_disposition_20260809/](./tracks/notification_data_disposition_20260809/)_
      _Remove the two empty, non-addressable historical notification tables and notification-only validator vocabulary. Read-only local persistence evidence is zero/zero; no remote deployment or data mutation is inferred. Full Convex/clean/browser gates are required before completion._

- [~] **Track: Bounded Factory Activation**
      _Link: [./tracks/bounded_factory_activation_20260808/](./tracks/bounded_factory_activation_20260808/)_
      _Activate one fail-closed imported-project workflow: one Pi-compatible agent, one atomic task assignment, one explicit project-scoped run, and one real-browser terminal result. Continuous mode remains off._

- [x] **Track: Route Fixes + Regression Tests** _(completed 2026-06-18)_
      _Link: [./archive/route_fixes_regression_20260613/](./archive/route_fixes_regression_20260613/)_
      _Fix all 7 QA findings from e2e_qa_smoke_20260613 (Convex API path mismatch, broken redirects, stubbed buttons, missing validation) plus 3 graph-discovered issues. Add Vitest regression tests and Kimi WebBridge smoke pass. Verified: smoke-config contract test 10/10 pass; all S1–S8 plan tasks green._

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

---

## Active Tracks (2026-08-07)

- [x] **Track: Secondary read trust recovery** — **High** _(completed 2026-08-08)_
      _Link: [./tracks/secondary_read_trust_recovery_20260808/](./tracks/secondary_read_trust_recovery_20260808/)_
      _Make History, Diagnose, Analytics, Templates, and unknown routes truthful and finite without adding new product surfaces._

- [x] **Track: Core workflow recovery** — **Critical** _(completed 2026-08-08)_
      _Link: [./tracks/core_workflow_recovery_20260808/](./tracks/core_workflow_recovery_20260808/)_
      _Restore the imported-project vertical slice from Portfolio through Dashboard, Project View, Sprint Planning, and Board; eliminate validator drift, slug/ID mismatch, read-side imports, and mock-only acceptance._

- [x] **Track: Scalpel branch closeout** — **Critical** _(completed 2026-08-07; merge pending human push/PR)_
      _Link: [./tracks/scalpel_branch_closeout_20260807/](./tracks/scalpel_branch_closeout_20260807/)_
      _Gates verified; Convex unit suite quarantined (TD-263); merge criteria in closeout.md. Pivot 1661/0, frontend 1211/0. Branch not pushed by this track._

- [x] **Track: Quality workflow visibility UI** — **High** _(completed 2026-08-07)_
      _Link: [./tracks/quality_workflow_visibility_ui_20260807/](./tracks/quality_workflow_visibility_ui_20260807/)_
      _Routes `/settings/quality` + `/ops/quality`, timeline quality rows, seed.goto, mocks. E2E `@quality-workflow` green. TD-261 resolved._

- [ ] **Track: Tailwind CSS 4 Migration** — **TD-242 (Medium)**
      _Link: [./tracks/tailwind_css_4_migration_20260625/](./tracks/tailwind_css_4_migration_20260625/)_
      _Frontend-only upgrade `tailwindcss` v3 → v4; migrate 4 `@apply` rules and `tailwind.config.js` tokens to `@theme`. Spec/plan refreshed 2026-08-07._

---

## Archived — 2026-08-07 Measure reconciliation

- [x] **Track: useConvexData god-file decomposition** — **TD-217 Resolved** _(closed 2026-08-07)_
      _Link: [./archive/useConvexData_godfile_decomposition_20260625/](./archive/useConvexData_godfile_decomposition_20260625/)_
      _Already shipped as `frontend/src/lib/convex-data/*` (earlier godfile-splits wave). June-25 track never started; residual barrel imports are optional Low hygiene. See closeout.md._

- [x] **Track: useConvexRealtime god-file decomposition** — **TD-218 Resolved** _(closed 2026-08-07)_
      _Link: [./archive/useConvexRealtime_godfile_decomposition_20260625/](./archive/useConvexRealtime_godfile_decomposition_20260625/)_
      _Already shipped as `frontend/src/lib/convex-realtime/*`. See closeout.md._

- [x] **Track: QualityWorkflowRunner production wiring** — **TD-252 Resolved** _(closed 2026-08-07)_
      _Link: [./archive/quality_workflow_runner_prod_wiring_20260625/](./archive/quality_workflow_runner_prod_wiring_20260625/)_
      _Duplicate of completed hot_path work. Production `server.ts` and `runAutoRunner()` already pass `createProductionQualityWorkflowHooks()`. UI residual moved to quality_workflow_visibility_ui_20260807._

- [x] **Track: Pipeline Unification & Scheduler Hardening**
      _Link: [./archive/pipeline_unification_scheduler_20260605/](./archive/pipeline_unification_scheduler_20260605/)_
      _Unify parallel execution pipelines, fix race conditions in async intervals, and implement reconciliation auto-repair for stuck tasks and orphan sprints. Committed: f395b11, a09e1dd._


---

## Completed — 2026-06-05 Review Output

_Created from the 2026-06-05 review session. The first is remediation of bugs/debt found this session; the rest are architecture/design improvements targeting the structural root causes (god-files, status drift, untyped Convex boundary, unenforced gates)._

- [x] **Track: Orchestrator God-Function Decomposition** _(archived 2026-06-18)_
      _Link: [./archive/orchestrator_decomposition_20260605/](./archive/orchestrator_decomposition_20260605/)_
      _Decomposed `runProject` behind characterization tests into a thin orchestration shell over testable stage modules. Closed TD-206; follow-up archival is tracked by `build_graph_context_reconciliation_20260618`._

## Archived/Completed — 2026-06-05 Review Output

- [x] **Track: Quality Workflow Production Hardening** _(completed 2026-06-13)_
      _Link: [./archive/quality_workflow_production_hardening_20260612/](./archive/quality_workflow_production_hardening_20260612/)_
      _Production-harden the quality workflow integration and RR7 migration cleanup: remove fake runners, wire real production hooks, harden Convex handlers and REST routes, fix WAL/resume/idempotency gaps, and close weak tests and frontend defects identified in the 24-hour commit review. Six atomic phase commits c209f6c, bfa4ded, 4b3f732, f8faafa, 68fb98c, 8eacb05._

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

## Completed — 2026-06-07 Package Maintenance

- [x] **Track: Package Dependency Upgrades & Security Remediation** _(archived 2026-06-18)_
      _Link: [./archive/package_dependency_upgrades_20260607/](./archive/package_dependency_upgrades_20260607/)_
      _Compatible upgrades and audit decisions completed; retained major upgrades are deferred as explicit TD/package-maintenance follow-ups. Follow-up archival is tracked by `build_graph_context_reconciliation_20260618`._

## Planned — 2026-06-09 Import Pipeline

- [x] **Track: Project Import, Sprint Creation & AI Story Generation**
      _Link: [./archive/project_import_pipeline_20260609/](./archive/project_import_pipeline_20260609/)_
      _Make workspace import real and reachable (tracks + tasks, idempotent), add UI sprint/track creation, and AI story generation with preview-then-commit._

## Completed — 2026-06-10 Settings Refactor

- [x] **Track: Settings Page Refactor and Notification Preferences** _(archived 2026-06-18)_
      _Link: [./archive/settings_page_refactor_20260610/](./archive/settings_page_refactor_20260610/)_
      _Decomposed settings into focused sub-pages, added Convex-backed notification preferences, and closed TD-216. Follow-up archival is tracked by `build_graph_context_reconciliation_20260618`._

## Planned — 2026-06-11 Router Migration

_(all tracks archived)_

## Completed — 2026-06-11 Quality Workflow Integration

- [x] **Track: Configurable Measure-Quality Workflow Integration** _(archived 2026-06-18)_
      _Link: [./archive/measure_quality_workflow_integration_20260611/](./archive/measure_quality_workflow_integration_20260611/)_
      _Library-level integration, schemas, UI, and parity tests completed. The 2026-06-18 review found production AutoRunner still omits real quality hooks; tracked by `quality_workflow_hot_path_wiring_20260618`._

## Completed — 2026-06-19 E2E Baseline Hardening

- [x] **Track: E2E Test Baseline Hardening** _(completed 2026-06-24)_
      _Link: [./archive/e2e_test_baseline_hardening_20260619/](./archive/e2e_test_baseline_hardening_20260619/)_
      _Stabilize the Playwright E2E baseline by fixing mock/data-seeding drift so the full suite runs green and becomes a trustworthy quality gate. Owns TD-250._

## Planned — 2026-06-22 Critical Debt

_(all tracks archived)_

## Completed — 2026-06-24

- [x] **Track: Unify Convex Clients** _(completed 2026-06-24)_
      _Link: [./archive/unify_convex_clients_20260622/](./archive/unify_convex_clients_20260622/)_
      _Merge `pivot/src/convexClient.ts` and `pivot/src/typedConvexClient.ts` into a single canonical typed client. Closes TD-204._

- [x] **Track: Score Audit Persistence Fix** _(completed 2026-06-24)_
      _Link: [./archive/score_audit_persistence_fix_20260622/](./archive/score_audit_persistence_fix_20260622/)_
      _Make `convex/scoreAudit.ts:createScoreAudit` actually insert a row instead of returning without persisting. Closes TD-200._

- [x] **Track: Auth Config and Identity** _(completed 2026-06-24)_
      _Link: [./archive/auth_config_identity_20260622/](./archive/auth_config_identity_20260622/)_
      _Add `convex/auth.config.ts` and remove the anonymous bootstrap fallback in `resolveActor` so production requests require identity. Closes TD-201._

- [x] **Track: Review Remediation — Production-Boundary & Test-Alignment Fixes** _(completed 2026-06-24)_
      _Link: [./archive/review_remediation_test_alignment_20260624/](./archive/review_remediation_test_alignment_20260624/)_
      _Remediate the 72h-review (2026-06-21..24) findings: fabricated zero-duration stage-boundary timestamps (`onStageResult`), `listTaskHistoryHandler` take-before-filter regression, `GET /api/pipelines` `pipelineName` never satisfying §AC5, trigger-route 5xx-for-client-errors, and the green-only "regression" tests that codify `pipelineName: 'unknown'` and were never red at HEAD (§AC9 unmet, Red tests deleted to pass the S5 closeout guard). Depends on `review_remediation_production_boundary_20260621`._
      _Phase 7 closeout: pivot 1843 pass / 4 skip / 0 fail; typecheck clean; FR-1..FR-8 satisfied end-to-end (revert-check evidence in plan.md Phase 6); graph.db safe rebuild 5455 nodes / 7779 edges / 664 files (audit times out per `(build_graph_audit_timeout)` lesson learned); depends on prior track `review_remediation_production_boundary_20260621`._

## Archived — 2026-06-22 Daily Closeout

- [x] **Track: Build Graph And Context Reconciliation** _(archived 2026-06-22)_
      _Link: [./archive/build_graph_context_reconciliation_20260618/](./archive/build_graph_context_reconciliation_20260618/)_
      _Safely rebuilt `graph.db`, fixed stale context routing, archived completed unarchived tracks, and made graph-dependent governance checks trustworthy. Closed TD-255; TD-240 remains tracked for scanner false positives._

- [x] **Track: Operations API Contract Closure** _(archived 2026-06-22)_
      _Link: [./archive/operations_api_contract_closure_20260618/](./archive/operations_api_contract_closure_20260618/)_
      _Registered reconciliation routes, wired `GET /api/pipelines`, deleted placeholder `convex/pipelines.ts`, and closed TD-253/TD-254._

- [x] **Track: Quality Workflow Hot-Path Wiring** _(archived 2026-06-22)_
      _Link: [./archive/quality_workflow_hot_path_wiring_20260618/](./archive/quality_workflow_hot_path_wiring_20260618/)_
      _Wired a real production `QualityWorkflowRunner` into server and CLI AutoRunner paths; non-none quality profiles now execute through real stage hooks. Closed TD-252._

- [x] **Track: Review Remediation — Production Boundary** _(archived 2026-06-22)_
      _Link: [./archive/review_remediation_production_boundary_20260621/](./archive/review_remediation_production_boundary_20260621/)_
      _Remediated three NO-verdict tracks by replacing boundary-mock tests with real-behavior tests for quality workflow hooks, operations pipeline persistence, and history API path drift. Pivot 1809/0 pass, closeout test 3/3 pass._

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

## Archived — 2026-06-13 QA Smoke

- [x] **Track: E2E QA/QC Smoke Test (Kimi WebBridge)** _(closed 2026-06-13)_
      _Link: [./archive/e2e_qa_smoke_20260613/](./archive/e2e_qa_smoke_20260613/)_
      _End-to-end QA/QC smoke test for Fleet Commander using Kimi WebBridge to drive the user's real browser and validate every route, button, form, and user-facing interaction from a user perspective. All 7 stories (S1–S7) GREEN: 38-route inventory, dev-stack probe, route runner, element runner, navigation runner, findings generator, coverage reporter. 209 contract tests pass (3505 expect calls across 8 files). Live QA pass produced 7 findings (2 Critical, 3 High, 2 Medium) and 45 screenshots; 84% route pass rate. Findings handed off to track `route_fixes_regression_20260613`._
