# Specification - Bun Runtime Orchestrator and Dispatcher Migration

## Overview

Fleet Commander still relies on Go runtime paths for orchestrator execution, task dispatch lifecycle, and some agent/harness command wiring. This track migrates those runtime responsibilities to Bun services while keeping Convex as the canonical state store and preserving deterministic one-task-per-run policy.

## Motivation

- Product architecture has pivoted, but critical run-loop behavior is still coupled to Go internals.
- Cutover cannot happen safely without Bun-native orchestration for local execution and lifecycle persistence.
- The migration should preserve deterministic behavior and auditability while changing runtime implementation.

## Functional Requirements

- **FR1**: Implement a Bun-side orchestrator run loop that selects a single ready task per run.
- **FR2**: Use Convex-backed state as the source for candidate evaluation and run persistence.
- **FR3**: Execute local agent commands via Bun worker paths and persist lifecycle events/logs to Convex.
- **FR4**: Support blocker/issue creation pathways compatible with current Conductor broker expectations.
- **FR5**: Preserve harness resolution behavior for bundled/default harness definitions.
- **FR6**: Provide CLI entrypoints/scripts for manual and scheduled run execution under Bun.
- **FR7**: Document behavior parity and known differences against legacy Go orchestrator paths.

## Acceptance Criteria

1. Bun orchestrator run command exists and can execute one complete task lifecycle.
2. Dispatcher selection inputs/outputs are persisted in Convex for the migrated flow.
3. Execution logs and status transitions are visible to frontend/read APIs through Convex.
4. Existing harness invocation templates are usable through Bun runtime paths.
5. Verification demonstrates deterministic one-task execution semantics still hold.

## Non-Goals

- Full multi-track queue optimization rewrite.
- Replacing every advanced review workflow in one pass.
- Immediate removal of all Go orchestrator code in this track.

## Risks and Constraints

- Behavior drift in dependency/blocking evaluation is high risk; tests must assert parity.
- Local process execution and cancellation semantics differ between `os/exec` and `Bun.spawn`.
- Existing review hooks may require an intermediate compatibility adapter.
