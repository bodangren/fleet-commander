# Spec: God-File Splits and Test-Coverage Closure

## Problem

The graph-node audit (2026-06-02) and the primary remediation track (`graph_node_audit_remediation_20260602`) resolved duplicate implementations, dead code, schema validation, and Convex ID safety. Two categories of findings remain:

1. **God-files** — `pivot/src/orchestrator/orchestrator.ts` (1,196 lines, `runProject` is 985 lines), `frontend/src/lib/useConvexData.ts` (1,137 lines, 97 entities), and `frontend/src/lib/useConvexRealtime.ts` (399 lines, 77 entities) exceed maintainability thresholds. Extracting domain modules requires characterization tests first.

2. **Test coverage gaps** — Pivot routes, frontend hooks, and Convex handlers have thin or absent test coverage on production hot paths. Empty test files exist that don't exercise real code.

## Solution

Split each god-file behind characterization tests that lock current behavior, then extract domain modules. Close test coverage gaps on the highest-risk routes, hooks, and handlers. This is a pure refactoring track — no new product capabilities.

## Functional Requirements

- FR-1: Split `runProject` (orchestrator.ts) behind characterization tests. Extract stages: `loadTasks`, `scoreCandidates`, `checkBudget`, `checkCircuit`, `executeTask`, `persistRun`, `markReview`. Keep public behavior stable.
- FR-2: Split `useConvexData.ts` into domain files: catalog, projects, sprints, agents, costs, coverage, retrospectives, settings. Preserve barrel exports for incremental migration.
- FR-3: Split `useConvexRealtime.ts` into domain wrappers with propagated generics. Remove blanket `(args as Record<string, unknown>)` casts.
- FR-4: Extract `SettingsPage.tsx` data hooks for app config and notification preferences. Fix the local/Convex preferences race.
- FR-5: Extract hooks from `OptimizePage.tsx`, `ProjectViewPage.tsx`, `useAgentForm.ts`, and `useProjectView.ts` where tests cover the extracted behavior.
- FR-6: Add route tests for `projects`, `git`, `agents`, `sprints`, `settings` routes. Delete empty test files or fill with production-path assertions.
- FR-7: Add tests for `useConvexData` domain hooks (post-split), `useConvexRealtime` wrappers, and Convex unavailable states.
- FR-8: Add smoke tests for canonical kanban, markdown viewer/editor, settings, and project view routing.
- FR-9: Replace Convex handler tests that only use `createMockCtx` with tests exercising real query/mutation semantics where correctness depends on index ordering or transaction limits.
- FR-10: Replace `.collect().then(filter)` patterns with indexed queries where the audit flagged scalability risks (analytics, notifications, fleet catalog, portfolio, kanban, task timeline).

## Non-Functional Requirements

- Every extracted module must have at least one test that exercises the production import path.
- `build-graph update ./graph.db <changed-files>` after each completed task.
- Follow existing code conventions: single quotes, 2-space indentation, JSDoc on exports.
- No new product features — pure refactoring.

## Acceptance Criteria

- [ ] `runProject` is split into ≤7 named stages, each in its own file or clearly separated section, with characterization tests covering each stage.
- [ ] `useConvexData.ts` is split into ≥5 domain files with a barrel export. No file exceeds 200 lines.
- [ ] `useConvexRealtime.ts` is split into domain wrappers. No blanket `as Record<string, unknown>` casts remain.
- [ ] Pivot route test files exist for projects, git, agents, sprints, and settings with meaningful assertions (not empty).
- [ ] Frontend domain hook tests exist for the split useConvexData modules.
- [ ] `bun --cwd pivot test` and `bun --cwd frontend test` pass.
- [ ] `bun --cwd pivot typecheck` passes.
- [ ] `build-graph update ./graph.db <changed-files>` run for all source changes.

## Out of Scope

- New product features.
- Full replacement of Convex, Bun, React, or Vite.
- Fixing Medium and Low audit findings not listed above.
- Cosmetic UI redesign.
