# Spec: Orchestrator God-Function Decomposition

## Problem

`pivot/src/orchestrator/orchestrator.ts` is **1034 lines** and contains the
`runProject` god-function (TD-206, open Critical). A prior track
(`godfile_splits_and_test_coverage`) extracted some per-stage modules under
`orchestrator/stages/`, but the central `runProject` orchestration loop still
holds the bulk of the logic: stage sequencing, cost aggregation, pipeline-run
creation, error handling, and state transitions in one function.

This is the single largest source file in the codebase and the highest-traffic
hot path (every task execution flows through it). Its size makes it hard to
test in isolation, hides the race conditions that the
`pipeline_unification_scheduler` track had to fix, and is the canonical entry in
the new `godfile-allowlist.txt`. It is the last big god-file.

## Solution

Decompose `runProject` behind characterization tests into a thin orchestration
shell that sequences already-extracted (and newly-extracted) pure stage modules.
The shell should be readable end-to-end; each stage should be independently
unit-testable; no behavior changes.

## Acceptance Criteria

- [ ] Characterization tests capture current `runProject` behavior (happy path, budget-block, circuit-open, stage failure, reconciliation hand-off) **before** any refactor, through production imports.
- [ ] `runProject` is reduced to an orchestration shell that calls named stage functions in sequence; target < 200 lines.
- [ ] Each extracted stage is a pure-ish function with its own unit tests and a single responsibility (dispatch selection, cost aggregation, pipeline-run lifecycle, state transition, error capture).
- [ ] `orchestrator.ts` drops below the 500-line god-file threshold and is **removed from `godfile-allowlist.txt`** (TD-206 closed).
- [ ] No behavior change: full pivot suite and typecheck green; `build-graph callers` for `runProject` unchanged in count.
- [ ] `build-graph` updated; no new boundary violations.

## Out of Scope

- Changing the 5-stage pipeline semantics or agent-role model.
- The reconciliation sweep internals (owned by pipeline_unification_scheduler).
- Performance optimization beyond what falls out of the split.
