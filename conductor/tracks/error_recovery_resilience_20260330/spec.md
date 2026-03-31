# Specification - Error Recovery & Resilience

## Overview

Add structured error handling and recovery mechanisms across Fleet Commander's file watcher, parser, and orchestrator. Currently, corrupted markdown, missing files, and mid-execution failures crash or hang silently. This track introduces an error taxonomy, project health status model, resilient parsing, execution timeouts, and auto-recovery attempts.

## Functional Requirements

- **FR1:** Graceful handling of corrupted markdown files — log a warning, skip the file, and mark the affected project as degraded in the dashboard.
- **FR2:** Recovery from missing `plan.md` — either re-create from a default template or mark the project as degraded with a clear error message.
- **FR3:** Agent execution timeout handling with a configurable per-harness timeout (default 30 minutes); kill and record failure on timeout.
- **FR4:** Detection of harness binary disappearance mid-run — monitor the process, detect exit, and fail the execution gracefully with a log entry.
- **FR5:** Project health status model (`healthy`, `degraded`, `error`) visible in the dashboard and CLI status output.
- **FR6:** Auto-recovery attempts for recoverable errors (re-parse after file change, restart failed harness if within retry limit).

## Acceptance Criteria

1. A project with a corrupted `plan.md` (e.g., malformed YAML frontmatter) is listed as `degraded` in `conductor status` and dashboard, with an error message citing the parse failure.
2. Deleting `plan.md` from an active project triggers re-creation from a template or marks the project as `degraded`, not a crash.
3. An agent execution exceeding the configured timeout is killed, logged as `status: timeout`, and the task is marked failed.
4. Removing a harness binary while an execution is running results in a logged error and the execution marked `status: error` instead of a silent hang.
5. Dashboard shows a health indicator (green/yellow/red) per project reflecting the current health status.
6. A transient file-lock error during parsing triggers up to 3 automatic retries before marking the project degraded.

## Out of Scope

- Distributed failure detection across multiple Fleet Commander instances.
- Automatic harness binary re-download or recompilation.
- Alerting/notifications for degraded projects (future track).
- Undoing partially completed task mutations on failure.
