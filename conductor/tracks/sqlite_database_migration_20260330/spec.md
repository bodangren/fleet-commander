# Specification - SQLite Database Migration

## Overview

Connect the existing `internal/database/` package (schema, stores, WAL-mode SQLite) to the main server process and migrate data from the current filesystem-based storage (markdown + JSONL) into SQLite. Introduce dual-write mode so that SQLite and filesystem stay in sync, then switch read queries to SQLite for performance. Filesystem markdown remains the source of truth for plans.

## Functional Requirements

- **FR1:** Add a migration command (`conductor migrate`) that reads all existing filesystem state (projects, tracks, tasks, issues, logs) and inserts it into SQLite.
- **FR2:** Implement dual-write middleware on API handlers — every write persists to both the filesystem and SQLite simultaneously.
- **FR3:** Switch read queries (filtered logs, cross-project stats, task listings) to SQLite for improved performance.
- **FR4:** Keep filesystem markdown files (`plan.md`, `tracks.md`) as the authoritative source of truth; SQLite is a queryable cache.
- **FR5:** Provide a validation command that compares filesystem state against SQLite state and reports discrepancies.
- **FR6:** Support rollback to filesystem-only mode by disabling the SQLite read path and stopping dual-write.

## Acceptance Criteria

1. Running `conductor migrate` imports all existing projects, tracks, tasks, issues, and execution logs into SQLite without data loss.
2. After dual-write is enabled, creating a task via the API writes the entry to both `plan.md` and the `tasks` table.
3. The `/api/projects/:id/logs` endpoint returns results from SQLite with correct filtering, not from JSONL parsing.
4. `plan.md` and `tracks.md` files are still written to disk on every mutation; they remain the canonical plan representation.
5. Running `conductor validate` produces a report showing zero discrepancies on a freshly migrated database.
6. Setting `--storage-mode=filesystem` reverts all read paths to filesystem parsing and disables SQLite writes.

## Out of Scope

- Schema versioning or automatic schema migrations (future track).
- Full-text search over markdown content.
- Migration from other database backends (Postgres, MySQL).
- Real-time replication of SQLite to a remote server.
