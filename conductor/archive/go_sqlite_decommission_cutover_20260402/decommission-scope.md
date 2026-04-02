# Decommission Scope — Go/SQLite Cutover

## Gate Status

| Prerequisite | Status | Evidence |
|---|---|---|
| Frontend Convex migration | ✅ Pass | `conductor/archive/frontend_convex_migration_20260402/` — 7 slices Convex-ready |
| Bun orchestrator migration | ✅ Pass | `conductor/archive/bun_orchestrator_migration_20260402/` — 23 tests passing |

**Gate verdict: PASS** — proceed with cutover.

---

## Scope Decision

The Bun orchestrator (`pivot/src/orchestrator/`) provides replacement modules for the Go orchestrator and dispatcher, but the Bun server (`pivot/src/server.ts`) has **not yet replaced** the Go HTTP server (`main.go`). The Go server still handles:

- Stats, Sprints, Dependencies, Settings
- Agent/Harness CRUD and discovery
- Task execution and WebSocket streaming
- Health check, backup/restore, migration, validation

**Therefore: the Go runtime is NOT removed in this track.** Only dead code is archived. Full Go retirement deferred to a follow-up track when the Bun server covers all API surfaces.

---

## Module Classification

### ARCHIVE (dead code — zero production usage)

| Module | Reason |
|---|---|
| `internal/analysis/` | Zero imports anywhere in codebase |
| `internal/coverage/` | Zero imports anywhere in codebase |
| `internal/harnesses/` | No Go files; stale `defaults/` dir duplicate of `internal/harness/defaults/` |

### RETAIN — Superseded but still coupled to Go server

| Module | Bun Replacement | Why Retained |
|---|---|---|
| `internal/orchestrator/` | `pivot/src/orchestrator/` | Imported by `main.go`, `project_routes.go` |
| `internal/dispatcher/` | `pivot/src/orchestrator/evaluator.ts`, `candidates.ts` | Imported by `main.go`, `project_routes.go` |
| `internal/dependency/` | `pivot/src/orchestrator/candidates.ts` | Imported by `dependency_api.go` |
| `internal/executor/` | `pivot/src/orchestrator/executor.ts` | Imported by `main.go`, `task_routes.go` |
| `internal/review/` | (within orchestrator Bun) | Internal dep of `orchestrator/` |
| `internal/runner/` | (within executor Bun) | Internal dep of `executor/` |
| `internal/storage/` | Convex | Internal dep of `harness/`, `agents/` |

### RETAIN — Active, no replacement planned

| Module | Used By |
|---|---|
| `internal/agents/` | `api_agents.go`, `api_management.go` |
| `internal/backup/` | `backup_api.go`, `cmd_backup.go` |
| `internal/config/` | `main.go`, `project_routes.go`, `settings_routes.go` |
| `internal/database/` | `main.go`, `cmd_migrate.go`, `cmd_validate.go`, `stats.go`, `project_issues.go`, `project_logs.go`, `project_routes.go` |
| `internal/estimation/` | `estimation_api.go` |
| `internal/harness/` | `api_harnesses.go`, `api_management.go` |
| `internal/hub/` | `main.go`, `task_routes.go` |
| `internal/issues/` | `project_issues.go` |
| `internal/logs/` | `main.go`, `project_logs.go`, `project_routes.go` |
| `internal/models/` | 8 root-level files |
| `internal/parser/` | `main.go`, `project_routes.go`, `cmd_validate.go` |
| `internal/registry/` | 10 root-level files |
| `internal/scanner/` | `project_routes.go` |
| `internal/sprintplanner/` | `sprint_suggest.go` |
| `internal/store/` | `sprints.go` |
| `internal/watcher/` | `main.go` |

### Root-level Go files

All root-level `.go` files are RETAINED — they are the Go HTTP server entry point and API handlers.

---

## Rollback Plan

1. Git tag `pre-decommission-20260402` created before any deletions
2. Archived modules moved to `conductor/archive/_superseded_go_modules_20260402/`
3. To rollback: `git checkout pre-decommission-20260402` or restore from archive directory

---

## Next Track (Deferred)

A follow-up track will handle full Go retirement when:
- Bun server replaces all Go HTTP API surfaces
- Frontend fully switches to Convex/Bun data sources
- All remaining Go-only slices (Stats, Sprints, Dependencies) have Bun/Convex replacements
