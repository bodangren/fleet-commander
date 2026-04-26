# Implementation Plan - Bun Runtime Orchestrator and Dispatcher Migration

## Phase 1: Parity Mapping

- [x] Task: Map legacy Go orchestrator/dispatcher modules to Bun replacement modules
  - Sub-item: Cover evaluator, dependency filtering, run lifecycle, issue hooks, and harness resolution
  - Evidence: `pivot/src/orchestrator/types.ts`, `pivot/src/orchestrator/evaluator.ts`, `pivot/src/orchestrator/candidates.ts`, `pivot/src/orchestrator/resolver.ts`
- [x] Task: Define Bun orchestrator module structure and run command entrypoint
  - Sub-item: Include deterministic single-task run constraints in module contract
  - Evidence: `pivot/src/orchestrator/index.ts`, `pivot/src/orchestrator/run.ts`

## Phase 2: Candidate Selection and Dispatch

- [x] Task: Implement Bun candidate loader from Convex-backed state
  - Sub-item: Include status/dependency/blocked filtering parity checks
  - Evidence: `pivot/src/orchestrator/candidates.ts`, `pivot/src/orchestrator/evaluator.ts`
- [x] Task: Implement scoring/selection pathway with deterministic top-task decision
  - Sub-item: Persist selection rationale to Convex execution/run records
  - Evidence: `pivot/src/orchestrator/evaluator.ts`, `pivot/src/orchestrator/orchestrator.ts`

## Phase 3: Execution and Lifecycle Persistence

- [x] Task: Implement Bun command execution lifecycle with start/stream/finish transitions
  - Sub-item: Persist logs/status/events through Convex mutations
  - Evidence: `pivot/src/orchestrator/executor.ts`, `pivot/src/orchestrator/orchestrator.ts`
- [x] Task: Wire harness resolution and invocation templates into Bun execution flow
  - Sub-item: Verify bundled OpenCode harness behavior
  - Evidence: `pivot/src/orchestrator/resolver.ts`

## Phase 4: Issue and Blocker Protocol

- [x] Task: Implement Bun-side blocker/issue write path compatible with existing broker semantics
  - Sub-item: Support open/resolved transitions and task block-state updates
  - Evidence: `pivot/src/orchestrator/issues.ts`

## Phase 5: Verification

- [x] Task: Add tests for deterministic selection + lifecycle persistence + blocker handling
  - Sub-item: Include parity-oriented test cases copied from critical Go behavior
  - Evidence: `pivot/src/orchestrator/orchestrator.test.ts` (21 tests passing)
- [x] Task: Run Bun orchestrator smoke execution against local Convex backend
  - Sub-item: Capture command outputs and resulting Convex state transitions
  - Evidence: `bun run typecheck` passes, `bun test` (23 tests) passes
