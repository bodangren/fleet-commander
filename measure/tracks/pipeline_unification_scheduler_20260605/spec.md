# Spec: Pipeline Unification & Scheduler Hardening

## Problem

Fleet Commander currently runs two parallel task execution pipelines:
1. `pivot/src/orchestrator/orchestrator.ts` — the canonical 5-stage pipeline (Dispatch → Architect → Executor → Reviewer → Merger)
2. `pivot/src/pipeline/scheduler.ts` — a secondary scheduler with its own `PipelineOrchestrator` that fetches ready tasks and mutates state independently

This dual-pipeline setup creates silent conflicts: both systems can claim the same task, mutate sprint costs inconsistently, and leave pipeline runs in contradictory states. Additionally:
- `runAutoRunner` has a racy async interval closure: overlapping `runAllProjects` calls can stack up when execution exceeds the interval (TD-207)
- `sendPromptToSession` has a residual flag-based timeout race that can orphan agent sessions (TD-208)
- `pivot/src/reconciliation/sweep.ts` detects drift between conductor and canonical state but the load/save functions are no-op stubs that never persist or repair (TD-202)

## Solution

Unify execution behind a single canonical pipeline with explicit execution guards. Fix all race conditions with proper cancellation tokens and overlap prevention. Implement the reconciliation sweep so it detects drift, persists canonical state, and auto-repairs stuck tasks by re-evaluating them against the current orchestrator state.

## Acceptance Criteria

- [ ] `pipeline/scheduler.ts` is deprecated and removed; all task execution flows through `orchestrator/runProject` (or its split stages)
- [ ] `runAutoRunner` uses a mutex/lock so only one `runAllProjects` cycle executes at a time; overlapping ticks are skipped with a warning log
- [ ] `sendPromptToSession` uses `AbortController` instead of flag-based timeout; orphaned sessions are cleaned up on cancellation
- [ ] `runReconciliationSweep` persists canonical state to disk and detects added/modified/deleted tracks, tasks, and issues
- [ ] Auto-repair rule: tasks stuck `in_progress` for >30 minutes without a running pipelineRun are moved back to `ready`
- [ ] Auto-repair rule: tasks in `ready` whose dependencies are incomplete are moved to `blocked` with `blockerReason`
- [ ] Auto-repair rule: sprints marked `active` with no `in_progress` or `ready` tasks and non-zero completed tasks are auto-closed
- [ ] Reconciliation divergences are exposed via a new `getReconciliationStatus` Convex query for the Diagnose view
- [ ] All changes covered by integration tests that exercise production imports

## Out of Scope

- Replacing the cron scheduler with a queue-based worker system
- Distributed locking across multiple Bun server instances
- Reconciliation of binary artifacts or non-markdown files
- UI redesign of the Diagnose view (reuse existing Operations UI)
