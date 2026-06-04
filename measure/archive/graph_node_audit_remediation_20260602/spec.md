# Spec: Graph Node Audit Remediation

## Problem

The graph-node audit in `measure/reviews/graph-node-audit/MASTER-REPORT.md` found 17 Critical and 47 High findings across pivot, frontend, and Convex. The highest-risk pattern is not isolated defects; it is incomplete track closeout: exported code is tested but never wired into production, duplicate implementations coexist after replacement tracks, public mutations and migration helpers are still stubs, and test files often exist without covering the hot path.

The current `graph.db` remains useful for remediation planning. `build-graph stats ./graph.db` reports 4,049 nodes, 5,914 edges, and confirms the audit's largest hot spots: `frontend/src/lib/useConvexData.ts`, `frontend/src/lib/useConvexRealtime.ts`, `pivot/src/orchestrator/orchestrator.ts`, and `pivot/src/orchestrator/types.ts`.

## Solution

Run a risk-ordered remediation program that turns the audit report into enforced codebase invariants. The first pass fixes public stubs, latent security/data-corruption bugs, and known probable 500s. The second pass resolves dead-code and duplicate-implementation drift by choosing canonical runtime paths, wiring useful code into production, and deleting obsolete code. The final pass splits god-files only after behavior is covered by tests, then adds graph-backed checks so future Measure tracks cannot claim integration through test-only imports.

## Functional Requirements

- FR-1: Triage every Critical and High finding from the master report's Top-25 queue into one of `fixed`, `deleted`, `deferred-with-tech-debt-id`, or `reclassified-with-evidence`.
- FR-2: Fix public API stubs that return `null` or `args` without writing, especially `convex/scoreAudit.ts:createScoreAudit`, `convex/dispatchPolicyStats.ts:upsertDispatchPolicyStats`, `convex/migrate.ts`, `convex/seed.ts`, and `pivot/src/reconciliation/sweep.ts`.
- FR-3: Resolve latent security and type-safety risks at the Convex boundary: missing `convex/auth.config.ts`, development-only anonymous bootstrap, `v.string()` document IDs, and production `as any` casts.
- FR-4: Pick one canonical implementation for each duplicate subsystem identified by the report, migrate consumers, delete the loser, and document the canonical choice.
- FR-5: For orphan exports, make an explicit wire-or-delete decision. Useful exports must be exercised by integration tests through production imports; obsolete exports must be removed with their stale tests and re-exports.
- FR-6: Replace high-risk hand-rolled route body validation with shared schema parsing in the pivot route layer, starting with `projects`, `git`, `agents`, and `sprints`.
- FR-7: Split god-files and god-functions only behind characterization tests that lock current behavior and route/component wiring.
- FR-8: Close red-phase test gaps called out by the audit, prioritizing routes and hooks that are in the production hot path.
- FR-9: Add graph-backed guardrails for orphan exports, boundary leaks, duplicate common-name nodes where feasible, and stale `graph.db` usage.
- FR-10: Merge or supersede the audit's proposed lessons learned and tech-debt additions so unresolved issues remain visible after this track completes.

## Non-Functional Requirements

- Keep baseline debt separate from current-scope fixes; do not hide unresolved items by deleting them from the audit without a linked resolution.
- Preserve the existing product direction: Bun pivot server, Convex as system of record, React/Vite frontend, and simple cron scheduler.
- Follow Measure TDD discipline: write contract or characterization tests before changing behavior.
- Use JSDoc for every new exported function and replace misleading copy-paste JSDoc on touched exports.
- Keep `graph.db` current after each completed task with `build-graph update ./graph.db <changed-files>`.

## Acceptance Criteria

- [ ] Every Top-25 master-report row has a remediation note in this track's plan or a linked tech-debt entry.
- [ ] No public mutation or public route in the audited set returns `null` or `args` as a placeholder success response.
- [ ] `git grep "as any" -- pivot/src convex frontend/src` returns only approved test or documented legacy exceptions.
- [ ] `build-graph` can identify no production export whose only inbound reference is a sibling test file, excluding explicitly documented fixtures.
- [ ] The app has one canonical scheduler/execution path, one markdown parser, one kanban implementation, one Convex client wrapper, and one source of truth for Convex availability.
- [ ] The prioritized route and hook gaps have meaningful tests that exercise production code paths, not empty test files.
- [ ] `npm run lint`, `bun --cwd pivot typecheck`, `bun --cwd frontend check`, `bun --cwd pivot test`, and `bun --cwd frontend test` pass or have documented baseline-only failures.
- [ ] `build-graph update ./graph.db <changed-files>` has been run for all source changes in the track.

## Out of Scope

- New product capabilities beyond remediating audit findings.
- Full replacement of Measure, build-graph, Convex, Bun, React, or Vite.
- Cosmetic UI redesign unrelated to duplicate implementation removal or god-file extraction.
- Fixing every Medium and Low finding from the audit unless it blocks a Critical or High remediation.
