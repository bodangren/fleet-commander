# Specification - Strategic Platform Pivot: Bun + Convex

## Overview

Fleet Commander is currently defined and implemented as a local-first Go daemon with SQLite persistence, filesystem-watched Measure artifacts, and WebSocket streaming. This track establishes and executes a strategic platform pivot to a Bun + Convex architecture where Convex becomes the primary system of record for projects, tracks, tasks, issues, execution logs, agent definitions, harness definitions, and orchestration state.

Under the target model, markdown track artifacts remain important, but they become durable documentation and export/synchronization artifacts for the managed project rather than the sole runtime source of truth for Fleet Commander itself.

This is not a narrow storage migration. It is a controlled product rewrite that replaces the current runtime assumptions described in `measure/product.md` and `measure/tech-stack.md`.

## Motivation

The current implementation is tightly coupled to:

- Go HTTP handlers and process orchestration
- SQLite-backed stores in `internal/database/`
- filesystem parsing and watching of `measure/` artifacts
- WebSocket fanout for real-time state updates

The Bun + Convex target stack changes all of those assumptions:

- Bun becomes the primary application runtime and tooling baseline
- Convex becomes the authoritative application database and backend API surface
- realtime state should flow through Convex subscriptions instead of bespoke WebSocket hubs where practical
- track markdown becomes generated or synchronized documentation, not the only canonical operational state
- local machine operations remain outside Convex itself; Bun owns workstation-local process execution, filesystem access, and any worker bridge needed to connect local execution back to Convex

## Functional Requirements

- **FR1**: Define a target architecture that replaces the current Go + SQLite runtime with Bun + Convex while preserving Fleet Commander's core product goals: multi-project oversight, task dispatch, execution logging, issue handling, and agent/harness management.
- **FR2**: Convex must become the canonical store for Fleet Commander runtime entities, including projects, tracks, tasks, issues, execution logs, settings, agent definitions, and harness definitions.
- **FR3**: Bun must replace the Go daemon as the primary local runtime for application startup, local development workflows, and workstation-local orchestration that Convex should not own directly.
- **FR4**: The system must support a migration path from existing SQLite data and filesystem-derived state into Convex with explicit cutover sequencing and rollback notes.
- **FR5**: Track documentation written into managed projects must continue to exist, but their role must be explicit: synchronized/exported documentation of work and state rather than the sole runtime database for Fleet Commander.
- **FR6**: The pivot must preserve or intentionally redefine the current product's critical capabilities:
  - project registration and discovery
  - track/task visibility
  - issue tracking and delegation
  - execution logs
  - agent and harness management
  - dispatcher/orchestrator state
  - review and automation surfaces
- **FR7**: The architecture must make the runtime boundary explicit:
  - Convex owns application state, backend functions, auth integration, realtime subscriptions, and scheduling metadata/jobs
  - Bun owns local subprocess execution, local filesystem watching, and any machine-local bridge that reports execution state back to Convex
- **FR8**: Convex-facing implementation work for this track must use the installed Convex skills and the repo-local `convex-developer` subagent where appropriate for architecture, schema, auth, migration, and performance decisions.

## Acceptance Criteria

1. A replacement architecture document exists in the codebase through updated track artifacts and any required product/tech-stack changes, and it explicitly states what is being retired from the Go + SQLite design.
2. A Bun-based application entry path and package/tooling baseline exists in the repo for the new stack.
3. A Convex project exists in the repo with initial schema and generated types covering Fleet Commander core entities.
4. The migration plan explicitly defines which current sources move to Convex first, how markdown artifacts are synchronized/generated, and what the cutover sequence is.
5. At least one thin vertical slice proves the new architecture end-to-end using Bun + Convex for read/write state and frontend consumption.
6. The track plan includes decommission tasks for SQLite-backed stores and superseded Go runtime surfaces once Bun + Convex parity is reached.
7. Documentation and directives in `measure/` no longer present the Go daemon + SQLite architecture as the current target state after the pivot baseline is established.

## Non-Goals

- Preserving every current Go abstraction unchanged.
- Running the old and new architectures indefinitely in parallel.
- Achieving complete feature parity in a single implementation slice.
- Treating markdown artifacts as the primary runtime database after cutover.

## Risks and Constraints

- The current system is deeply coupled to SQLite schema and Go service boundaries, so this effort should be treated as a staged rewrite, not an adapter layer.
- Existing active tracks targeting Go-only expansion may need resequencing or explicit supersession if they deepen obsolete architecture.
- Convex authentication and authorization choices must be made deliberately; do not assume a provider without documenting the decision.
- Interactive Convex bootstrap steps may require a human to run `npx convex dev` or equivalent account/deployment setup during implementation.

## Notes

- Current evidence for the outgoing architecture includes:
  - SQLite initialization and schema bootstrap in `internal/database/db.go`
  - process execution in `internal/runner/command_runner.go`
  - WebSocket hub fanout in `internal/hub/hub.go`
  - filesystem watcher/parsing flow in `internal/watcher/service.go`
- This track should prefer incremental proof slices with explicit cutover criteria over a long-lived ambiguous hybrid.
