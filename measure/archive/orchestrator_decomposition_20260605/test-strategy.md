# Test Strategy: Orchestrator God-Function Decomposition

## Testing Pyramid by Phase

- Phase 1: Wide characterization at integration/service level first, using production `runProject` imports and mocked Convex/client hooks; minimal new unit tests.
- Phase 2: Shift most coverage to fast unit tests for extracted stage modules, with characterization tests as regression canaries after each extraction.
- Phase 3: Keep `runProject` shell covered by unchanged characterization tests; add only thin orchestration-order tests if a seam is otherwise invisible.
- Phase 4: Verification-heavy: pivot suite, typecheck, graph update/audit, and Measure doctor checks replace new behavior tests.

## Shared Fixtures and Mocks

- Create reusable Bun test builders for `Task`, track status maps, project records, run IDs/time, execution results, and policy/circuit/budget responses.
- Use a single Convex client mock shape with `query`/`mutation` call recording; assert mutation targets/args, not internal implementation steps.
- Reuse the WAL mock pattern from stage tests: `append` returns `{ id, commit }`, and `commit` is asserted only after successful writes.
- Mock `Date.now()` deterministically for run IDs, pipeline timing, stuck-task thresholds, and lifecycle timestamps.
- Keep executor, git hooks, issue hooks, coverage hooks, and harness hooks injected through existing `runProject` parameters.
- Prefer production imports from `pivot/src/orchestrator/orchestrator.ts` for characterization; use direct stage imports only for extracted pure-ish modules.

## Cross-Phase Edge Cases and Dependencies

- No active/eligible tasks returns `no_tasks` with no task mutations.
- Budget missing/query failure fails open; strict/advisory denial blocks before execution.
- Circuit open blocks execution; circuit failure/success recording follows execution outcome.
- Single-stage executor failure persists failed run, logs/captures error, creates blocker/recovery side effects, and leaves WAL uncommitted on Convex failure.
- Ready/blocked/in_progress transitions must preserve existing `reconcileTaskState` semantics where reused.
- Empty project, inactive tracks, dependency-blocked tasks, dispatch rejections, validation errors, hook failures, and coverage failures must remain behaviorally unchanged.
- Pipeline-run lifecycle must preserve create/append/finalize ordering, run status values, timings, selected task key, raw output, and track ID propagation.
- Cost aggregation must handle absent costs, partial role costs, retries, failed runs, and zero totals without double counting.

## Architecture Guardrails

- No behavior changes during extraction; characterization tests should remain unchanged from Phase 1 through Phase 3.
- Extracted stages should be single-responsibility, typed, and pure where possible; side-effect stages must receive dependencies explicitly.
- `runProject` remains the public orchestration shell; its signature and caller count must stay unchanged.
- Avoid new global state, hidden timers, direct Convex client construction in stages, or cross-stage circular imports.
- Stage modules belong under `pivot/src/orchestrator/stages/`; shared types come from existing orchestrator type modules when possible.
- Preserve WAL fallback behavior and never make logging/error-capture failures mask the original execution outcome.
- Keep `orchestrator.ts` below 500 lines and `runProject` target below 200 lines before removing the god-file allowlist entry.

## Per-Phase Test Notes

### Phase 1: Characterization Net
- Add high-value `runProject` tests for happy path ready-to-merged, budget-block, circuit-open, execution failure/recovery, and empty-project no-op.
- Assert public `RunResult`, Convex mutation/query side effects, hook calls, issue/log calls, and task/run status transitions.
- Record baseline commands: `build-graph inspect ./graph.db runProject`, `build-graph callers ./graph.db runProject`, `bun --cwd pivot test`, `bun --cwd pivot typecheck`.

### Phase 2: Extract Stage Boundaries
- For `aggregateCost`, write table-driven pure tests over role costs, missing values, retries, and failed stage outputs.
- For `pipelineRunLifecycle`, assert mutation/log ordering, WAL commit/non-commit behavior, and tolerated Convex failures.
- For state-transition decisions, test the full ready/blocked/in_progress matrix against dependency and running-run inputs.
- For error capture, assert severity, context fields, original error preservation, and non-throwing logging failures.
- After each extraction, run the Phase 1 characterization subset plus that stage’s unit test file.

### Phase 3: Thin the Shell
- Do not rewrite characterization expectations; failures indicate extraction drift.
- Add a lightweight shell test only if necessary to verify stage sequencing with injected fakes.
- Recheck `build-graph callers ./graph.db runProject` count and line-count targets.

### Phase 4: Close the Debt
- Run full `bun --cwd pivot test`, `bun --cwd pivot typecheck`, `npm run lint`, `./measure/doctor.sh god-file`, and `./measure/doctor.sh all` where available.
- Update graph for changed files and ensure no new boundary violations before closing TD-206.

## Build-Graph Findings

- `graph.db` exists and `build-graph stats` reports 4,500 nodes, 6,429 edges, and 577 files; pivot has 189 files.
- `runProject` is exported from `pivot/src/orchestrator/orchestrator.ts:131` and spans roughly lines 153-1137 in graph metadata, confirming the god-function target.
- `build-graph callers ./graph.db runProject` returned no function callers; preserve this baseline count unless graph precision changes.
- `orchestrator.ts` appears among the largest pivot files and existing stage modules already cover `checkBudget`, `checkCircuit`, `scoreCandidates`, `persistRun`, `appendRunLog`, `updateTaskStatus`, and `markReview`.
- `reconcileTaskState` exists in `pivot/src/orchestrator/reconciliationHelpers.ts` with tests for ready/blocked/in_progress transitions; new transition extraction should reuse or mirror this contract.
