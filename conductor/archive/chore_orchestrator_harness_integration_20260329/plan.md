# Implementation Plan - Orchestrator-Harness Integration & Deduplication

## Phase 1: Deduplicate resolvePlanPath
- [x] Task: Add a `ResolvePlanPath(projectPath, planPath string) string` function to `internal/parser/parser.go`.
- [x] Task: Update `main.go` to call `parser.ResolvePlanPath` instead of the local `resolvePlanPath`.
- [x] Task: Update `internal/orchestrator/run.go` to call `parser.ResolvePlanPath` instead of the local `resolvePlanPath`.
- [x] Task: Write tests for `parser.ResolvePlanPath` covering directory references, .md file references, relative paths, and absolute paths.

## Phase 2: Bridge ExecutionService to Agent/Harness Stores
- [x] Task: Add an `AgentHarnessResolver` to `internal/executor/` that resolves an agent name to a CLI command and arguments.
- [x] Task: Implement the resolver using `agents.Store` and `harness.Store` to look up the agent's model (harness/model format), then build the invocation from the harness definition template.
- [x] Task: Replace `LoadDefaultAgentConfigs` usage in `ExecutionService` with resolver-based approach. Keep a fallback `echo` config for when no agent/harness is configured.
- [x] Task: Write tests for the resolver covering model parsing, template substitution, and fallback behavior.

## Phase 3: Connect Orchestrator to ExecutionService
- [x] Task: Add a `TaskExecutor` interface to `internal/orchestrator/` that `Orchestrator.Run` calls instead of sleeping.
- [x] Task: Inject the `ExecutionService` (via the interface) into the `Orchestrator` constructor using functional options.
- [x] Task: Update `main.go` to wire the `ExecutionService` into the `Orchestrator`.
- [x] Task: Write tests for the orchestrator verifying it delegates to the executor interface.
- [x] Task: Remove the `time.Sleep(2 * time.Second)` mock execution from `Orchestrator.Run`.
