# Specification — Go/SQLite Final Decommission & Cutover

## Overview

The previous decommission track (`go_sqlite_decommission_cutover_20260402`) only archived dead code (analysis, coverage, harnesses). The Go HTTP server on `:8081` remains the active runtime with 59 endpoints, ~130 Go files, and SQLite persistence. The Bun orchestrator in `pivot/` has core dispatcher/executor logic but the Bun server (`pivot/src/server.ts`) exposes only 3 endpoints.

This track replaces the Go HTTP server entirely with a full Bun server backed by Convex, switches the frontend to Bun, and removes Go from the runtime.

## Motivation

- Two parallel runtimes (Go + Bun) create drift, confusion, and wasted effort.
- New tracks (CI/CD, review pipeline, deployment) are being built on top of both runtimes.
- The tech stack declares Bun + Convex as the target, but Go is still the active server.
- TD-009 documents the problem but no track has addressed it.

## Functional Requirements

- **FR1**: Bun HTTP server exposes all 34 frontend-consumed endpoints with identical request/response contracts.
- **FR2**: Convex functions cover all data operations currently handled by Go's SQLite stores (projects, tasks, issues, logs, stats, settings, agents, harnesses, sprints, dependencies).
- **FR3**: Bun server provides WebSocket support for real-time project output streaming.
- **FR4**: Bun server provides dependency graph endpoints (dependencies, critical-path).
- **FR5**: Bun server provides stats aggregation endpoints (overview, agents, issues, velocity).
- **FR6**: Bun server provides sprint CRUD endpoints.
- **FR7**: Bun server provides agent and harness CRUD endpoints.
- **FR8**: Bun server provides issue CRUD endpoints.
- **FR9**: Bun server provides log viewing and review history endpoints.
- **FR10**: Frontend `dataAdapter.ts` or equivalent configuration switches from Go to Bun as the default source.
- **FR11**: Go HTTP server is removed from the development and build workflow.
- **FR12**: All Go source files are archived (not deleted) with rollback documentation.

## Acceptance Criteria

1. All 34 frontend-consumed HTTP endpoints are available on the Bun server with matching contracts.
2. WebSocket endpoint `/api/projects/{id}/ws` works on Bun server.
3. Frontend builds and runs against Bun server with no Go dependency.
4. `bun --cwd pivot run dev` starts the full application (no `go run .` needed).
5. `bun --cwd pivot run test` passes.
6. `cd frontend && bun run build` succeeds against Bun server.
7. Go source files archived to `measure/archive/` with a documented rollback path.
8. `go.mod`, `go.sum`, and all `*.go` files removed from active source tree.
9. `measure/workflow.md` and `measure/tech-stack.md` updated to reflect Bun-only runtime.
10. Tech debt TD-009 resolved.

## Out of Scope

- CLI subcommands (`cmd_backup.go`, `cmd_migrate.go`, `cmd_validate.go`) — defer to follow-up track or replace with Bun scripts.
- Backup/restore API endpoints — defer (not called by frontend).
- Sprint suggestion/burndown — defer (not called by frontend).
- Task estimation endpoints — defer (not called by frontend).
- Filesystem scanner/watcher — defer to dedicated track.
- New product features or UI changes beyond wiring to Bun server.
- Performance optimization of ported endpoints.

## Risks

- Endpoint parity gaps discovered during cutover may require emergency Go fallback.
- WebSocket migration may surface edge cases in connection lifecycle.
- Convex schema may lack fields/indexes that Go SQLite stores use implicitly.
- Frontend hardcoded URLs or assumptions about Go-specific response shapes.

## Rollback Plan

1. Git tag `pre-go-decommission-final` created before any deletions.
2. Go source archived to `measure/archive/_go_runtime_final_20260402/`.
3. To rollback: restore from archive, revert frontend config, restart Go server.
