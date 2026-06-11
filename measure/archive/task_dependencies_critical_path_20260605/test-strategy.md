# Test Strategy: Task Dependencies & Critical Path

Tech Lead notes for testing the retooled, characterization-first track. Scope is to pin existing scaffolding behavior, fix the known critical-path bug, then layer Convex + UI + planning tests. Coverage target: >80% on new/changed code.

## 1. Testing Pyramid (per phase)

| Phase | Unit (Vitest, pure) | Convex/Integration | Frontend Component | E2E (Playwright) |
| --- | --- | --- | --- | --- |
| 1 Pure utils | 90% — full table-driven | — | — | — |
| 2 Backend mutations/queries | reuse Phase 1 | 80% — convex-test on every mutation/query | — | — |
| 3 Task detail + board UI | — | mocked Convex hooks | 80% — RTL + vitest-renderer | — |
| 4 Sprint planning | recommender pure unit | 1 convex-test for `getCriticalPath` wiring | small RTL for warning banner | — |
| 4b Makespan estimator | full unit (formula table) | 1 integration via recommender | UI surface check | — |
| 5 Blockers dashboard | — | mocked Convex hooks | RTL for `BlockersTable`, `BlockerChain` | 1 e2e smoke (load `/blockers`) |
| 6 Verification | — | — | — | manual scripts in plan §6 |

Default: write unit tests for every pure function; only escalate to integration when behavior crosses a Convex/DOM boundary.

## 2. Shared Fixtures & Mocks

Create once, reuse across phases. Avoid `mock.module` (lessons-learned `bun_mock_module`) — prefer dependency injection.

- **`pivot/src/orchestrator/__fixtures__/dependencyFixtures.ts`** (new): `makeTask({ taskKey, dependencies, storyPoints, status })`, plus canned graphs: `linearChain3`, `diamond`, `parallelBranches`, `disconnected`, `selfLoop`, `twoCycle`, `threeCycle`. **Every** Phase 1/2/4 test imports from here.
- **`convex/__fixtures__/foundation.ts`** (existing): extend with `seedTasksWithDeps(t, graph)` helper that takes a fixture graph and inserts tasks via `t.run`. Reuse for all `convex-test` cases.
- **`frontend/src/__fixtures__/dependencyFixtures.ts`** (new): React-shaped fixtures matching the Convex query return type (`getBlockedTasks`, `getCriticalPath`). Mirror the pivot fixtures so the same scenario names line up.
- **Convex client mock**: use existing patterns from `frontend/src/__fixtures__/insightsFixtures.ts` + `convex-provider.test.tsx`; do NOT stub `fetch` for Convex.
- **No `as any`**: per lessons-learned `as_any_mask`; the existing `dependencyUtils.ts` uses `(task as any)?.storyPoints` — fixtures must give `storyPoints` typed properly so production code can drop the cast in Phase 1.

## 3. Cross-Phase Edge Cases & Dependencies

These must each have a named test that survives across phases (unit → convex-test → UI assertion):

1. **Self-dependency** — Phase 1 unit rejects in `detectCycle`; Phase 2 `addTaskDependency` mutation must reject with the same error shape; Phase 3 editor must show the cycle warning.
2. **2-node and 3-node cycle** — same triple-layer assertion as above.
3. **Diamond graph** — critical path picks the heavier branch (regression for the known bug in spec §Problem). Same diamond used in Phase 4 recommender ordering test and Phase 4b makespan test (makespan = critical-path duration, ≠ sum of points).
4. **Disconnected DAG** — `topologicalSort` returns all nodes; `computeCriticalPath` picks the heaviest connected component; `estimateSprintMakespan` overlaps the two components.
5. **Missing dependency key** (task references non-existent taskKey) — pure functions must skip silently; Convex mutation must reject at write time.
6. **Blocker on `done` task** — `getBlockedChain` returns the entry; `estimateUnblockTime` excludes it; UI does NOT render a blocked badge.
7. **Unbounded query risk** (lessons-learned `convex_queries`) — every new Convex query must use `withIndex(...).take(N)`; assert with a unit test that calls the query against a seeded 500-task project and verifies row count cap.
8. **Optimistic state** (lessons-learned `state_mutation`) — `addTaskDependency` mutation must not pre-mutate UI cache; test the error rollback path.

## 4. Architecture Guardrails

- **Test through production imports** (lessons-learned `track_closeout`, `test_coverage_claims`). No sibling helper duplication of `detectCycle` logic inside tests.
- **No `as any`** in new code; type fixtures correctly (lessons-learned `as_any_mask`). Phase 1 must remove the existing `(task as any)?.storyPoints` casts.
- **Pure functions stay pure** — `dependencyUtils.ts` must not import Convex, React, or fetch; enforced by a doctor-style import test or eyeballed in review.
- **Convex query bounds** — no `.collect()` on unbounded sets; use `by_project` index + `.take(N)` with explicit N. `checkAndUnblockDownstream` in `convex/dependencies.ts:31` currently `.collect()`s all project tasks — flag for review in Phase 2 (likely acceptable since bounded by project, but document N or add `.take`).
- **No cross-package boundary leaks** — `pivot/src/planning/recommender.ts` already imports across the pipeline boundary (TD-205). The Phase 4 work must not deepen that debt; new dependency-aware logic stays in `dependencyUtils.ts` and is imported by recommender, not duplicated.
- **One canonical implementation** (lessons-learned `parallel_systems`, `dual_implementations`): `topologicalSort` exists in `dependencyUtils.ts` AND `topologicalSortForRecommender` exists in `recommender.ts:8`. Phase 4 must consolidate to one; tests must assert recommender uses the canonical export.
- **Schema status vocabulary** — `blocked` status must be added to schema validator before UI references it (doctor.sh Check 6).

## 5. Per-Phase Test Approach Notes

- **Phase 1** — Read each function, write a table-driven `it.each` per function using shared fixtures. Diamond test for `computeCriticalPath` is the regression gate; if the existing code passes a naive linear-chain test but fails diamond, that's the bug. Add an explicit `it('takes heavier branch in diamond, not first-discovered branch')`.
- **Phase 2** — Use `convex-test` (existing pattern in repo). One test file per mutation/query. Cycle-detection mutation tests reuse Phase 1 fixture graphs via `seedTasksWithDeps`. `getBlockedTasks` test must include the bounded-query assertion (item 7 above).
- **Phase 3** — RTL + vitest-renderer. `DependencyEditor` autocomplete test must cover: keystroke → suggestion list → add → cycle rejection. `KanbanCard` blocked badge: render with `dependencies: ['T-1']` where T-1 is `todo` → badge present; flip to `done` → badge gone. Mock Convex via existing `convex-provider.test.tsx` patterns.
- **Phase 4** — Recommender unit test: given diamond fixture, sorted output respects topo order. Sprint-start warning: integration-light RTL test asserting banner appears when selected tasks contain incomplete external deps.
- **Phase 4b** — Write the sub-spec FIRST, then `estimateSprintMakespan` tests: single task (makespan = points), parallel branches (max, not sum), chain (sum), diamond (longer branch). Wire-up test asserts UI shows makespan as a distinct field from cost.
- **Phase 5** — `BlockersTable` snapshot + interaction tests; `BlockerChain` breadcrumb renders depth-ordered with status badges. One Playwright smoke: navigate to `/blockers`, assert table renders with seeded fixture. Unblock-toast test uses Convex hook mock.
- **Phase 6** — Manual checklist already in plan. Add: run `build-graph audit ./graph.db` after `update` to confirm no orphan edges; run `bun --cwd pivot test --coverage` and `bun --cwd frontend test --coverage` and record numbers in the commit body.

## 6. Build-Graph Findings That Shaped This Strategy

- **Graph is fresh** (mtime today; `stats`: 4836 nodes, 6736 edges, 634 files).
- **All five pure functions exist** in `pivot/src/orchestrator/dependencyUtils.ts:12–270` (`detectCycle`, `topologicalSort`, `computeCriticalPath`, `getBlockedChain`, `estimateUnblockTime`) with a sibling `dependencyUtils.test.ts` — Phase 1 is genuinely characterization, not greenfield.
- **Zero call-edges into these functions** (`callers` returned no results for all five; `inspect` shows only `contains` + `param_flow` edges). This is the **orphan_detection** signal from lessons-learned: the scaffolding is exported but not wired into production. Phase 2 (mutations) and Phase 4 (recommender) tests must prove production wiring, not just unit correctness — otherwise these become dead code.
- **`computeCriticalPath` reconstruction**: read of source (`dependencyUtils.ts:124–171`) shows it DOES use DP over topo order with `prev[]` reconstruction — implementation looks plausible. The spec-cited bug ("follows arbitrary dependency branches") may already be fixed in the scaffolding OR may be a subtler edge case. The diamond regression test is non-negotiable; if it passes on first run, document that and move on.
- **`topologicalSort` duplication**: `topologicalSortForRecommender` exists in `recommender.ts:8` separately. Strategy item 4 calls for consolidation in Phase 4.
- **`convex/dependencies.ts` already has 474 lines** including `checkAndUnblockDownstream` (line 10). Phase 2 tasks may already be partly implemented — verify before writing duplicate mutations.
- **Frontend scaffolding exists**: `DependencyEditor.tsx`, `DependencyGraphMini.tsx`, `BlockerChain.tsx`, `BlockersPage.tsx`, plus matching `.test.tsx` files. Like Phase 1, Phase 3/5 are characterization-first — read what's there before writing.
- **Two `DependencyGraph` components** (`frontend/src/components/DependencyGraph.tsx` plus `kanban/DependencyGraphMini.tsx`) — lessons-learned `dead_code` / `duplication`: decide which is canonical before adding tests to either.

MEASURE_AGENT_RESULT
role: strategy
status: complete
track: task_dependencies_critical_path_20260605
phase: track setup
commits: none
tests_run: none (strategy only, no code changes)
files_changed: measure/tracks/task_dependencies_critical_path_20260605/test-strategy.md (new)
plan_updates: none — strategy is additive guidance; plan.md unchanged
known_failures: none
handoff: Phase 1 implementer should (1) read existing dependencyUtils.ts and its test file before writing new tests, (2) build the shared fixture file first, (3) run the diamond regression on computeCriticalPath as the first new test, (4) verify wiring of these pure functions into Convex mutations and the recommender — current build-graph shows zero call-edges, an orphan-detection red flag.
END_MEASURE_AGENT_RESULT
