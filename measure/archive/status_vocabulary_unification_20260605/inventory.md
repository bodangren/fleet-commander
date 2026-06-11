# Inventory: Status & Enum Vocabularies

Phase 1 deliverable for `status_vocabulary_unification_20260605`. Locked contract for Phase 2/3/4; do not edit validators or schema until Phase 2 begins.

**Methodology:** Grep `v.union(v.literal(...))` across `convex/` (80 matches in 28 files) + `convex/lib/validators.ts` (19 exports). Pivot/frontend consumers from `build-graph` search + manual inspection of the 6 `statusColors` maps in `frontend/src/components/**` and `frontend/src/pages/OptimizePage.tsx`. Zod-based pivot enums (`pivot/src/**/runContract.ts`, `pivot/src/orchestrator/types.ts`, `pivot/src/policy/providerHealth.ts`) are noted under **§5 Out of Scope (Zod)** per test-strategy §6 — they are NOT part of this track.

## 1. Vocabularies Already Exported from `convex/lib/validators.ts`

These are the canonical sources. Phase 2 only needs to update consumers to import from here, NOT add new exports.

| Validator | Values | Definition site | Consumer sites (converge on import) |
| --- | --- | --- | --- |
| `projectStatus` | `active\|paused\|archived` | `convex/lib/validators.ts:3` | `convex/projects.ts` (transitive; not yet importing) |
| `sourceKind` | `manual\|scanner\|import` | `convex/lib/validators.ts:9` | unused by current grep — candidate for archive |
| `trackStatus` | `new\|active\|blocked\|complete\|archived` | `convex/lib/validators.ts:15` | `convex/schema/planning.ts:6` ✓ |
| `taskStatus` | `backlog\|ready\|in_progress\|review\|done\|blocked` | `convex/lib/validators.ts:23` | `convex/schema/core.ts:62`, `convex/schema/tasks.ts:12`, `convex/kanban.ts:12` ✓. **DRIFT:** `convex/projectTemplates.ts:13-19` inlines 6 literals. **Display:** `frontend/src/components/kanban/DependencyEditor.tsx:20` (drops `review`). |
| `priority` | `low\|medium\|high` | `convex/lib/validators.ts:32` | `convex/schema/core.ts:61`, `convex/schema/tasks.ts:13` ✓. **DRIFT:** `convex/kanban.ts:13`, `convex/projectTemplates.ts:12`, `convex/sprintPlanning.ts:12` all inline the same 3 literals. |
| `boardStatus` | `active\|archived` | `convex/lib/validators.ts:38` | `convex/schema/core.ts:40` ✓ |
| `issueStatus` | `open\|triaged\|resolved\|closed` | `convex/lib/validators.ts:43` | `convex/schema/operations.ts:34` ✓ |
| `runStatus` | `queued\|running\|succeeded\|failed\|cancelled` | `convex/lib/validators.ts:50` | `convex/schema/tasks.ts:40,66,90` ✓ |
| `retrospectiveStatus` | `pending\|running\|completed\|failed` | `convex/lib/validators.ts:58` | **NOT IMPORTED.** `convex/schema/contracts.ts:71-76` inlines the same 4 literals. Single replacement site. |
| `notificationType` | 10 literals (see validators.ts) | `convex/lib/validators.ts:65` | `convex/schema/operations.ts:49`, `convex/notifications.ts:29,148` ✓ |
| `agentRole` | `architect\|executor\|reviewer\|merger` | `convex/lib/validators.ts:78` | `convex/schema/agents.ts:19,109`, `convex/schema/planning.ts:39,62`, `convex/abTests.ts:136` ✓. **DRIFT:** `convex/schema/core.ts:68-73` inlines 4 literals in `defaultAgents`. |
| `agentStatus` | `active\|idle\|blocked\|offline` | `convex/lib/validators.ts:85` | `convex/schema/agents.ts:24` ✓. **SEMANTIC CONFLICT:** see `employeeStatus` below — the `agents` table uses `agentStatus`; the `employees` table uses a different `active\|away` vocabulary. Two entities, two vocabularies, one overlapping name. |
| `sprintStatus` | `planned\|active\|closed` | `convex/lib/validators.ts:92` | `convex/schema/planning.ts:25` ✓. **DISPLAY DRIFT:** `frontend/src/components/SprintPanel.tsx:83-87` uses `planning\|active\|completed` — different words. |
| `pipelineStage` | `dispatch\|architect\|executor\|reviewer\|merger` | `convex/lib/validators.ts:98` | `convex/schema/tasks.ts:52` ✓ |
| `providerStatus` (operational) | `active\|rate_limited\|idle` | `convex/lib/validators.ts:106` | `convex/schema/agents.ts:37` ✓. TD-235 closed: health values no longer overload this. |
| `providerHealthStatus` | `healthy\|degraded\|unhealthy` | `convex/lib/validators.ts:112` | `convex/schema/agents.ts:38,56` ✓. **DISPLAY:** `frontend/src/components/providers/ProviderCard.tsx:18-34` mixes operational and health literals in a single `statusColors` map. Phase 2 should split or label. |
| `abTestStatus` | `draft\|running\|completed` | `convex/lib/validators.ts:118` | `convex/schema/planning.ts:49` ✓. **DISPLAY:** `frontend/src/pages/OptimizePage.tsx:11-15` matches exactly ✓ |
| `supportedModels` | 6 model names | `convex/lib/validators.ts:124` | `convex/schema/agents.ts:110` ✓ |
| `routingPolicy` | `quality_first\|cost_first\|balanced\|manual` | `convex/lib/validators.ts:133` | `convex/schema/core.ts:27`, `convex/schema/contracts.ts:45` ✓ |

## 2. Vocabularies to be Promoted into `validators.ts` (Phase 2 work)

These are inline `v.union(v.literal(...))` definitions that need to be hoisted into `convex/lib/validators.ts` as exports, then replaced with imports. Display-map column lists the *one* co-located display map to be extracted (per test-strategy §1 rule: "one map per vocabulary").

| Canonical name (target export) | Values | Inline definition sites | Consumer (frontend/pivot display map) |
| --- | --- | --- | --- |
| `employeeStatus` | `active\|away` | `convex/schema/agents.ts:11`, `convex/employees.ts:12`, `convex/employees.ts:111`, `convex/scheduler.ts:26` (4 sites) | none — no UI renders this directly |
| `pipelineRunStatus` | `running\|completed\|failed` | `convex/schema/tasks.ts:57` (1 site) | none |
| `reconciliationProposalStatus` | `pending\|applied\|rejected` | `convex/reconciliationEngine.ts:5`, `convex/reconciliationProposals.ts:5`, `convex/schema/operations.ts:97` (3 sites) | none |
| `reconciliationArtifactType` | `track\|task\|issue` | `convex/reconciliationEngine.ts:6`, `convex/reconciliationProposals.ts:6`, `convex/reconciliationEvents.ts:7,20,90`, `convex/schema/operations.ts:77,92` (6 sites) | none |
| `reconciliationSourceSide` | `convex\|markdown` | `convex/reconciliationEngine.ts:7`, `convex/reconciliationProposals.ts:7`, `convex/schema/operations.ts:95` (3 sites) | none |
| `reconciliationDivergenceType` | `added\|modified\|deleted` | `convex/reconciliationEvents.ts:9,22`, `convex/schema/operations.ts:79` (3 sites) | none |
| `reconciliationDecisionType` | `apply\|reject` | `convex/reconciliationDecisions.ts:5`, `convex/schema/operations.ts:109` (2 sites) | none |
| `alertType` | 6 literals (see below) | `convex/alerts.ts:6-12`, `convex/schema/operations.ts:7-14` (2 sites) | none |
| `alertSeverity` | `critical\|warning\|info` | `convex/alerts.ts:14`, `convex/fleet.ts:214`, `convex/schema/operations.ts:15` (3 sites) | none |
| `orchestratorErrorSeverity` | `fatal\|warning\|debug` | `convex/orchestratorErrors.ts:10,26,48`, `convex/schema/contracts.ts:92` (4 sites) | none |
| `analysisSeverity` | `error\|warning\|info` | `convex/analysisResults.ts:12,28,63`, `convex/schema/analytics.ts:76` (4 sites) | none |
| `budgetPolicy` | `strict\|soft\|advisory` | `convex/budgets.ts:21,52,284`, `convex/schema/analytics.ts:30` (4 sites) | none |
| `budgetPeriodType` | `daily\|weekly\|monthly` | `convex/budgets.ts:320` (1 site) | none |
| `notificationChannel` | `in_app\|webhook\|email` | `convex/notifications.ts:32,151`, `convex/schema/operations.ts:52` (3 sites) | none |
| `continuousModeState` | `running\|paused\|idle` | `convex/continuousMode.ts:9,58` (2 sites) | none |
| `abTestVariant` | `control\|treatment` | `convex/abTests.ts:133,149`, `convex/schema/planning.ts:59` (3 sites) | none |
| `pipelineTriggeredBy` | `manual\|task-complete` | `convex/pipelines.ts:72` (1 site) | none |
| `harnessTaskClass` | `feature\|bug\|chore\|review` | `convex/harnessProfiles.ts:33,39` (2 sites) | none |
| `retrospectiveTriggeredBy` | `manual\|scheduled` | `convex/retrospectives.ts:106`, `convex/schema/contracts.ts:77` (2 sites) | none |
| `executorStatus` | `succeeded\|failed` | `convex/schema/contracts.ts:25`, `convex/runContracts.ts:30,123` (3 sites) | none — pivot Zod mirror (out of scope, §5) |
| `reviewerStatus` | `passed\|failed\|needs-changes` | `convex/schema/contracts.ts:26`, `convex/runContracts.ts:31,151` (3 sites) | none — pivot Zod mirror (out of scope, §5) |
| `reviewerIssueClass` | `correctness\|security\|performance\|style\|spec_mismatch` | `convex/schema/contracts.ts:28`, `convex/runContracts.ts:33,153` (3 sites) | none — pivot Zod mirror (out of scope, §5) |
| `reviewerSeverity` | `blocker\|major\|minor` | `convex/schema/contracts.ts:29`, `convex/runContracts.ts:34,154` (3 sites) | none — pivot Zod mirror (out of scope, §5) |
| `recoveryAction` | `retry\|escalate\|split\|replan\|human_review` | `convex/schema/contracts.ts:31`, `convex/runContracts.ts:36,181` (3 sites) | none — pivot Zod mirror (out of scope, §5) |
| `circuitBreakerState` | `closed\|open\|half-open` | `convex/circuitBreakers.ts:12,33,68,95` (4 sites) | none |
| `portfolioHealth` | `green\|yellow\|red` | `convex/portfolio.ts:85` (1 site) | none |
| `leaderboardTrend` | `up\|down\|flat` | `convex/leaderboard.ts:23` (1 site) | none |
| `leaderboardTimeRange` | `7d\|30d\|all` | `convex/leaderboard.ts:44` (1 site) | none |
| `performanceTrend` | `improving\|stable\|declining` | `convex/performance.ts:261` (1 site) | none |
| `burnAction` | `keep\|drop` | `convex/burnForecast.ts:70` (1 site) | none |
| `scoreAuditOutcome` | `accepted\|rework\|rejected\|regression` | `convex/schema/analytics.ts:114-121` (1 site) | none |
| `governanceEventType` | `budget_breach\|budget_warning\|retry_escalation\|harness_selection\|review_depth` | `convex/schema/analytics.ts:37-43` (1 site) | none |

`alertType` values: `circuit_open|stall_detected|budget_breach|schema_drift|health_check_failed|performance_regression`.

## 3. Frontend Display-Map Inventory (consumers per test-strategy §1)

Each map must be co-located with its derived TS type (per Phase 2 task: "extract a single `{value: {label,color}}` map co-located with the type; update components to import it").

| File | Map name | Keys | Validator it should key off | Notes |
| --- | --- | --- | --- | --- |
| `frontend/src/lib/pipelineUtils.tsx:11` | `statusColors` | `succeeded\|failed\|running\|pending\|cancelled` | `runStatus` (subset) | subset, OK ✓ |
| `frontend/src/pages/OptimizePage.tsx:11` | `statusColors` | `draft\|running\|completed` | `abTestStatus` | exact match ✓ |
| `frontend/src/components/SprintPanel.tsx:83` | `statusColors` | `planning\|active\|completed` | `sprintStatus` | **MISMATCH** — uses `planning`/`completed` not `planned`/`closed`. Phase 2 must either rename the validator values or remap the display. |
| `frontend/src/components/kanban/DependencyEditor.tsx:20` | `statusColors` | `done\|in_progress\|ready\|blocked\|backlog` | `taskStatus` (subset, drops `review`) | subset ✓ but `review` is missing — Phase 2 must add it to the map |
| `frontend/src/components/DependencyGraph.tsx:29` | `statusColors` | `todo\|active\|blocked\|done` | NONE (drift from `taskStatus`) | **MISMATCH** — uses `todo`/`done` not `backlog`/`done`. Phase 2 should harmonise with `taskStatus`. |
| `frontend/src/components/providers/ProviderCard.tsx:18` | `statusColors` | `healthy\|active\|degraded\|unhealthy\|rate_limited\|idle` | mixed `providerStatus` ∪ `providerHealthStatus` | intentional merge (display is dot color, picker is `healthStatus ?? status`); Phase 2 should leave the union but document |
| `frontend/src/components/providers/ProviderCard.tsx:27` | `statusLabels` | same 6 keys | same | companion label map — leave as is, but co-locate with above |

## 4. Semantic Conflict — Requires Tech-Lead Decision Before Phase 2

The naming `agentStatus` and the inline `employees.status` (active|away) refer to two different entities (`agents` table vs `employees` table) with two different vocabularies (4 values vs 2 values). This is **not** a duplicate — it is a semantic distinction. Phase 2 must NOT collapse them. The decision is: keep `agentStatus` for `agents`, and add a new `employeeStatus` validator for the `employees` table. Recorded here for spec cross-reference; no action required in Phase 1.

## 5. Out of Scope (Zod — pivot runtime, NOT Convex validators)

Per test-strategy §6: Zod enums in `pivot/src/**` are a separate vocabulary system. They are NOT promoted to `convex/lib/validators.ts`. They are listed here only to prevent confusion during the Phase 2 refactor — a reader must not assume `pivot TaskStatus` is the same vocabulary as `convex taskStatus`.

| Pivot Zod file | Field | Values | Notes |
| --- | --- | --- | --- |
| `pivot/src/shared/runContract.ts:19` | `ExecutorOutput.status` | `succeeded\|failed` | mirrors `executorStatus` (Convex) |
| `pivot/src/shared/runContract.ts:25` | `ReviewerOutput.status` | `passed\|failed\|needs-changes` | mirrors `reviewerStatus` (Convex) |
| `pivot/src/shared/runContract.ts:28` | `ReviewerOutput.issueClass` | `correctness\|security\|performance\|style\|spec_mismatch` | mirrors `reviewerIssueClass` (Convex) |
| `pivot/src/shared/runContract.ts:30` | `ReviewerOutput.severity` | `blocker\|major\|minor` | mirrors `reviewerSeverity` (Convex) |
| `pivot/src/shared/runContract.ts:53` | `RecoveryOutput.action` | `retry\|escalate\|split\|replan\|human_review` | mirrors `recoveryAction` (Convex) |
| `pivot/src/orchestrator/types.ts:3` | `TaskStatus` | `todo\|ready\|in_progress\|blocked\|done\|for_review` | similar to but NOT identical with `convex taskStatus` (drops `backlog`, adds `for_review`) |
| `pivot/src/orchestrator/types.ts:4` | `RunStatus` | `queued\|running\|succeeded\|failed\|cancelled` | exact match with `convex runStatus` ✓ |
| `pivot/src/policy/providerHealth.ts:12` | `HealthStatus` | `healthy\|degraded\|unhealthy` | exact match with `providerHealthStatus` ✓ |
| `pivot/src/pipeline/types.ts:46` | `PipelineExecutionStatus` | unknown (zod) | internal pivot only |
| `pivot/src/pipeline/agentTypes.ts:13` | `TaskStatus` | unknown (ts) | pivot agent type |
| `pivot/src/pipeline/agentTypes.ts:23` | `AgentStatus` | `active\|idle\|blocked\|offline` | matches `agentStatus` (Convex) ✓ |
| `pivot/src/orchestrator/stages/persistRun.ts:21` | `PersistRunStatus` | `queued\|running\|succeeded\|failed` | matches `runStatus` subset ✓ |
| `pivot/src/__fixtures__/convex-mock.ts:4` | `TaskStatus` (test fixture) | `todo\|ready\|in_progress\|blocked\|done` | mock context only |

## 6. Build-Graph Notes (per test-strategy §6)

- `graph.db` mtime: 2026-06-06 (today). 4723 nodes / 6626 edges / 628 files. Fresh; no re-scan.
- `convex/lib/validators.ts` currently has 3 incoming `imports` edges: `convex/schema/agents.ts`, `convex/projects.ts`, `convex/providerHealthValidator.test.ts`. Phase 2 will multiply this ~10× — re-run `build-graph update ./graph.db convex/lib/validators.ts <each-touched-file>` after every Phase 2 commit per `lessons-learned.md::schema_status_drift`.
- `convex/runContracts.ts:30-36, 123, 151-154, 181` and `convex/schema/contracts.ts:25-31` are the highest-blast-radius duplicates (5 vocabularies, 2 files, 8 inline sites). Single Phase 2 commit must update both per test-strategy §3.
- `convex/reconciliationEngine.ts:5-7` and `convex/reconciliationProposals.ts:5-7` are 3-for-3 local duplicates; a single `reconciliationEngine.ts` import-export block will not deduplicate — the constants need to be promoted to `validators.ts` and re-imported.

## 7. Acceptance Criteria Mapping (spec.md §Acceptance)

| AC | Status |
| --- | --- |
| Inventory exists | ✓ this file |
| Each status vocabulary defined once as an exported validator | Phase 2 — see §1 already-exported and §2 to-promote lists |
| Derived TS type + display-label/color map exported from one module | Phase 2 — see §3 display-map ownership |
| `providers.status` overload resolved via `healthStatus` | ✓ already done (TD-235 resolved) — covered by `providerHealthStatus` |
| Doctor check flags new inline `v.union(v.literal(...))` in schema | Phase 4 — §2 list is the negative corpus |
| All suites + typecheck green; build-graph updated | Phase 4 |
