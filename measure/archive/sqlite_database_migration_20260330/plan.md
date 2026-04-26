# Implementation Plan - SQLite Database Migration

## Phase 1: Wire Database Package into main.go

- [x] Task: Initialize SQLite database on server startup in `main.go`
  - Open `~/.measure/fleet_commander.db` using `modernc.org/sqlite` driver
  - Enable WAL journal mode via PRAGMA
  - Call `database.Init(db)` to create all tables from existing schema
  - Store `*sql.DB` handle on the server struct for dependency injection
  - Write test: server starts and `fleet_commander.db` file exists with expected tables
- [x] Task: Pass DB handle to API handler constructors
  - Update `NewServer()` to accept `*sql.DB` or a stores interface
  - Thread DB through to `project_logs.go`, `project_tracks.go`, `project_tasks.go`
  - Write test: handlers receive non-nil DB connection

## Phase 2: Migration Command

- [x] Task: Implement `measure migrate` CLI command
  - Walk all project directories under configured root
  - Parse `plan.md` and `tracks.md` via `internal/parser/` to extract tracks and tasks
  - Read `issues.jsonl` and `execution_log.jsonl` per project
  - Bulk-insert into `projects`, `tracks`, `tasks`, `issues`, `execution_logs` tables
  - Write test: sample filesystem project migrates into SQLite with correct row counts
- [x] Task: Add migration progress reporting and error handling
  - Log per-project migration status (rows inserted, skipped, errors)
  - Abort and report on fatal parse errors; allow `--force` to skip bad projects
  - Write test: corrupted project is skipped with warning, not crash

## Phase 3: Dual-Write Middleware

- [x] Task: Create dual-write wrapper for mutating API handlers
  - After filesystem write succeeds, execute corresponding SQLite INSERT/UPDATE
  - Wrap in a transaction so SQLite failure triggers rollback of the API response
  - Write test: POST /api/projects/:id/tasks writes to both plan.md and tasks table
- [x] Task: Add dual-write for issue and log creation
  - Extend wrapper to `handleCreateIssue` and `handleCreateLog`
  - Write test: creating an issue persists in both JSONL and SQLite

## Phase 4: Switch Read Paths to SQLite

- [x] Task: Rewrite log query handlers to use `ExecutionLogStore`
  - Replace JSONL file scanning in `handleLogStats` with SQLite queries
  - Support filter parameters (agent, date range, status) via WHERE clauses
  - Write test: filtered log query returns same results as JSONL baseline
- [x] Task: Rewrite task and track listing handlers to use SQLite stores
  - Replace `parser.ParsePlan` for read-only listing with `TaskStore.List`
  - Maintain `parser.ParsePlan` as fallback when `--storage-mode=filesystem`
  - Write test: GET /api/projects/:id/tasks returns data from SQLite

## Phase 5: Consistency Validation Tool

- [x] Task: Implement `measure validate` command
  - Compare project, track, task, issue, and log counts between filesystem and SQLite
  - Report per-table discrepancy counts and sample mismatched records
  - Write test: clean migration produces zero discrepancies
- [x] Task: Add rollback flag to disable SQLite paths
  - `--storage-mode=filesystem` env var or config toggle
  - All reads revert to filesystem; dual-write stops
  - Write test: with flag set, no SQLite queries are executed

## Phase 6: Verification

- [x] Task: Run `npm run lint` and `npm run test` to verify no regressions
- [ ] Task: Manual verification: migrate sample project, verify dashboard loads stats from SQLite
- [x] Task: Update `measure/tracks/sqlite_database_migration_20260330/plan.md` to mark phases complete
