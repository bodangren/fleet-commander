# Implementation Plan - Bun Runtime Orchestrator and Dispatcher Migration

## Phase 1: Parity Mapping

- [ ] Task: Map legacy Go orchestrator/dispatcher modules to Bun replacement modules
  - Sub-item: Cover evaluator, dependency filtering, run lifecycle, issue hooks, and harness resolution
- [ ] Task: Define Bun orchestrator module structure and run command entrypoint
  - Sub-item: Include deterministic single-task run constraints in module contract

## Phase 2: Candidate Selection and Dispatch

- [ ] Task: Implement Bun candidate loader from Convex-backed state
  - Sub-item: Include status/dependency/blocked filtering parity checks
- [ ] Task: Implement scoring/selection pathway with deterministic top-task decision
  - Sub-item: Persist selection rationale to Convex execution/run records

## Phase 3: Execution and Lifecycle Persistence

- [ ] Task: Implement Bun command execution lifecycle with start/stream/finish transitions
  - Sub-item: Persist logs/status/events through Convex mutations
- [ ] Task: Wire harness resolution and invocation templates into Bun execution flow
  - Sub-item: Verify bundled OpenCode harness behavior

## Phase 4: Issue and Blocker Protocol

- [ ] Task: Implement Bun-side blocker/issue write path compatible with existing broker semantics
  - Sub-item: Support open/resolved transitions and task block-state updates

## Phase 5: Verification

- [ ] Task: Add tests for deterministic selection + lifecycle persistence + blocker handling
  - Sub-item: Include parity-oriented test cases copied from critical Go behavior
- [ ] Task: Run Bun orchestrator smoke execution against local Convex backend
  - Sub-item: Capture command outputs and resulting Convex state transitions
