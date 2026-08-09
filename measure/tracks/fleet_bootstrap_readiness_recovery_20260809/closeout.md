# Closeout: Fleet bootstrap readiness recovery

**Closed:** 2026-08-09  
**Status:** completed  
**TD-266:** Resolved  
**Implementation:** `1a6e8169635afb08e2c8a012dca455b9da6a3204`

## Outcome

Project identity and selection now become usable independently of optional
health, agent, and harness reads. Optional resources retain finite loading,
ready, and error/retry states. Existing Convex identity, id/slug resolution,
selectors, direct project links, and read-only request boundaries remain intact.
No API expansion or credentialed factory mutation was needed.

## Verification

- Focused integrated coverage: **25 files / 148 tests passed**.
- Full frontend: **176 files / 1,277 tests passed in 167.44s**; frontend
  check, production build, and repository lint passed. Build output was 2,800
  modules with a **1,354.15kB / 382.78kB gzip** main bundle; the known chunk
  warning remains.
- Pivot typecheck passed. Full Pivot passed **1,707/1,709 tests**; the only
  failures were `orgChartAgents.piReadiness` cases because the installed
  `/home/daniebo/Desktop/pi-measure-harness` lacks the full model reference
  `kimi-for-coding/kimi-for-coding-highspeed` required by the seeded intern.
- Doctor's as-any, boundary, stub-mutation, and status-vocabulary checks passed;
  known red findings were only `qualityWorkflowRunner` at 516 lines, 65 orphan
  findings, and 38 stale allowlist warnings. The existing
  graph audit is also noisy: synchronization covered 41 files (**75→354
  nodes**, **268→521 edges**), current stats were **5,824 nodes / 8,118 edges /
  706 files**, and the audit reported **676 `orphan_edges`** plus generated,
  dependency, CSS, schema, field, and route limitations in the existing graph
  tooling issue.

## Real-browser and API evidence

Real system Chrome ran with no mocks, route interception, seeds, credentials, or
mutations. The final matrix passed **3/3 in 21.8s** and five final cold repeats
passed **5/5 in 17.4s**. Selector samples were `1509, 1529, 1542, 1575, 1553`
ms (**p50 1542; nearest-rank p95/max 1575**); slug-resolution samples were
`300, 296, 293, 295, 292` ms (**p50 295; p95/max 300**). Configured project,
agent, and harness sources were Convex; page Bun catalog calls were zero; all
health responses were 200; and mutations, page/console/request/API errors were
zero.

Read-only characterization found projects list **21 rows / 200 / 1.720ms**,
slug detail **200 / 2.903ms** with canonical id/slug/path, agents **[] / 200 /
1.440ms**, and harnesses **8 rows / 200 / 1366.453ms**. No API expansion was
made.

The retained warning inventory is React `act` warnings across SprintPlanningPage,
ProjectViewPage save/perf, AgentDefaults, ProjectTemplates, Retrospective,
DependencyEditor, useProjectView, useAgentForm, ProjectCard, AgentsPage, and
useSprintPlanning; a Vitest `vi.fn` warning in App tests; a Kanban duplicate-key
warning; and the expected InsightsErrorBoundary log.

## Follow-up priorities

1. Correct harness roster drift, beginning with the missing Pi harnesses needed
   by `orgChartAgents.piReadiness`.
2. Restore warning trust: remove the listed React `act`, Vitest `vi.fn`, Kanban
   duplicate-key, and other classified warning sources without global
   suppression.
3. Split the oversized frontend bundle while protecting the core project path.
4. Reconcile remaining graph/Doctor audit limitations and stale allowlists only
   after the existing generated/dependency/CSS/schema/field/route noise is
   addressed.

No credentialed factory action was performed.
