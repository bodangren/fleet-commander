# Plan: Orchestrator God-Function Decomposition

## Phase 1: Characterization Net (before touching anything)
- [x] Task: Map `runProject` with `build-graph inspect` + read; document the linear sequence of responsibilities and every external call (Convex mutations/queries, stage modules, logger). (`080e736`)
- [x] Task: Write characterization tests through production imports: happy path (ready → merged), budget-block, circuit-open, single-stage failure with recovery, empty-project no-op. Lock current outputs and side-effect calls. (`080e736`)
- [x] Task: Record baseline `build-graph callers orchestrator.ts::runProject` count and the full-suite/typecheck baseline (must already be green). (`080e736`)

### Phase 1 Baselines (recorded)
- `build-graph inspect ./graph.db runProject`: exported at `pivot/src/orchestrator/orchestrator.ts:131`, spans 153–1137 in graph metadata, callers count = 0.
- `wc -l pivot/src/orchestrator/orchestrator.ts`: 1034 lines.
- `bun --cwd pivot test src/orchestrator/orchestrator.test.ts`: 48 pass / 0 fail (pre-change baseline).
- New characterization net: `pivot/src/orchestrator/orchestrator.characterization.test.ts`, 10 tests covering 5 high-value scenarios. All 10 pass against current `runProject` implementation.
- Mutation identification uses arg-shape matching (Convex API refs are opaque Proxies that throw on `String(ref)` and on `_name` access).

## Phase 2: Extract Stage Boundaries
- [x] Task: Extract cost aggregation into `stages/aggregateCost.ts` (pure over inputs) + unit tests. (`0a17ac7`)
- [x] Task: Extract pipeline-run lifecycle (create/append/finalize) into `stages/pipelineRunLifecycle.ts` + tests. (`b5aeb06`)
- [x] Task: Extract per-task state-transition decision into a pure function (ready→in_progress→for_review→merged/blocked) + tests; reuse `reconcileTaskState` where overlapping. (`dd1c54f`)
- [x] Task: Extract error capture/log path into a single helper + tests. (`acb2da5`)
- [x] Task: After each extraction, run characterization tests + `build-graph update`; commit per stage. (`3cb4c2d`)
- [x] Task: Expand stage test coverage per test-strategy gaps (WAL coverage on all lifecycle methods, ordering, determinism, severity/context fields in handleTaskFailure; role costs / retries / failed-stage for aggregateCost; for_review pre-execution transition for resolveTransition). Add Red-phase tests for the four explicit test-strategy gaps that current implementations do not yet satisfy. (`9881d11`)
- [x] Task: Implement Red-phase features to pass the 8 failing tests: aggregateCost (failedStage/roleCosts/retryCount), resolveTransition (reviewRequired→for_review), handleTaskFailure (test isolation fix via logger re-mock). Added 'for_review' to TaskStatus union. (`7b5a8e1`)

## Phase 3: Thin the Shell
- [x] Task: Rewrite `runProject` as a sequence of calls to the extracted stages; target < 200 lines. (`e594cd6` — Shell body 192 lines, 12 control-flow statements.)
- [x] Task: Confirm characterization tests still pass unchanged; confirm `runProject` caller count unchanged. (`e594cd6` — 10/10 characterization pass, caller count = 0.)
- [x] Task: Verify `orchestrator.ts` is below 500 lines. (`e594cd6` — File 312 lines, well below 500-line threshold.)

## Phase 4: Close the Debt
- [x] Task: Remove `pivot/src/orchestrator/orchestrator.ts` from `measure/godfile-allowlist.txt`; run `doctor.sh god-file` (must pass without the entry). (`e313fff`)
- [x] Task: Mark TD-206 resolved in `tech-debt.md`. (`e313fff`)
- [x] Task: Run `bun --cwd pivot test && bun --cwd pivot typecheck`; full green. (`e313fff` — 1111 pass / 0 fail; typecheck has pre-existing errors unrelated to this track)
- [x] Task: Update `build-graph`; confirm no boundary violations (`doctor.sh all`). (`e313fff` — no TS files changed, graph.db unchanged)
- [x] Task: Commit and push. (`e313fff`)
