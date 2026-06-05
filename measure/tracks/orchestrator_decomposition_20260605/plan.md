# Plan: Orchestrator God-Function Decomposition

## Phase 1: Characterization Net (before touching anything)
- [x] Task: Map `runProject` with `build-graph inspect` + read; document the linear sequence of responsibilities and every external call (Convex mutations/queries, stage modules, logger).
- [x] Task: Write characterization tests through production imports: happy path (ready → merged), budget-block, circuit-open, single-stage failure with recovery, empty-project no-op. Lock current outputs and side-effect calls.
- [x] Task: Record baseline `build-graph callers orchestrator.ts::runProject` count and the full-suite/typecheck baseline (must already be green).

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
- [x] Task: After each extraction, run characterization tests + `build-graph update`; commit per stage.

## Phase 3: Thin the Shell
- [ ] Task: Rewrite `runProject` as a sequence of calls to the extracted stages; target < 200 lines, readable top-to-bottom.
- [ ] Task: Confirm characterization tests still pass unchanged; confirm `runProject` caller count unchanged.
- [ ] Task: Verify `orchestrator.ts` is below 500 lines.

## Phase 4: Close the Debt
- [ ] Task: Remove `pivot/src/orchestrator/orchestrator.ts` from `measure/godfile-allowlist.txt`; run `doctor.sh god-file` (must pass without the entry).
- [ ] Task: Mark TD-206 resolved in `tech-debt.md`.
- [ ] Task: Run `bun --cwd pivot test && bun --cwd pivot typecheck`; full green.
- [ ] Task: Update `build-graph`; confirm no boundary violations (`doctor.sh all`).
- [ ] Task: Commit and push.
