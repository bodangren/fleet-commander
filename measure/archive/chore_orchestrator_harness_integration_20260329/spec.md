# Specification - Orchestrator-Harness Integration & Deduplication

## Problem

The orchestrator engine (`internal/orchestrator`) currently uses mock execution (`time.Sleep(2s)`) and the `ExecutionService` hardcodes two `echo` agent configs instead of resolving agents through the real agent/harness store. Additionally, `resolvePlanPath` is duplicated between `main.go` and `orchestrator/run.go`.

## Scope

1. **Deduplicate `resolvePlanPath`**: Move the shared function into a single canonical location (`internal/parser/` or a utility) and have both `main.go` and `orchestrator/run.go` call it.
2. **Bridge ExecutionService to agent/harness stores**: Replace the hardcoded `LoadDefaultAgentConfigs` with resolution through the `agents.Store` and `harness.Store`, so that when a task is dispatched, the real agent definition and harness binary are used to construct the CLI invocation.
3. **Remove mock sleep from Orchestrator.Run**: The orchestrator should delegate execution to `ExecutionService` instead of sleeping.

## Acceptance Criteria

- `resolvePlanPath` exists in exactly one location and is called from both `main.go` and `orchestrator/run.go`.
- `ExecutionService` no longer hardcodes `echo` agent configs; it resolves agent+model from the `agents.Store` and `harness.Store`.
- `Orchestrator.Run` calls `ExecutionService.ExecuteTask` instead of `time.Sleep`.
- All existing tests pass; new tests cover the integration points.
- Go build succeeds; frontend build succeeds.
