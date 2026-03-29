# Implementation Plan - Cleanup Agent/Harness Integration

## Phase 1: Remove Duplicates and Dead Code

- [x] Task: Remove duplicate agent files from `internal/agents/defaults/*.md`
  - [x] Delete architect.md, dispatcher.md, junior-dev.md, mid-dev.md, product-manager.md, reviewer.md, senior-backend.md, senior-frontend.md
  - [x] Verify only files in `defaults/agents/` subdirectory remain
  - [x] Commit changes

- [x] Task: Remove hardcoded agent configs from ExecutionService
  - [x] Remove `agentConfigs` field from `ExecutionService` struct
  - [x] Remove `LoadDefaultAgentConfigs()` method
  - [x] Remove `RegisterAgentConfig()` method
  - [x] Remove `GetAgentConfig()` method
  - [x] Remove `prepareArgs()` method
  - [x] Update `main.go` to remove call to `LoadDefaultAgentConfigs()`
  - [x] Commit changes

## Phase 2: Simplify Resolution Logic

- [x] Task: Refactor resolveCommand to single-path resolution
  - [x] Modify `resolveCommand()` to use resolver only
  - [x] Return `(string, []string, error)` signature
  - [x] Return clear error messages for:
    - Agent not found
    - Agent model format invalid
    - Harness not found
    - Harness binary not on PATH
  - [x] Update `ExecuteTask()` to handle error from `resolveCommand()`
  - [x] Commit changes

- [x] Task: Add harness binary availability check
  - [x] Add `exec.LookPath` check in `resolveCommand()` after harness lookup
  - [x] Return descriptive error if binary not found
  - [x] Add test for missing binary scenario
  - [x] Commit changes

## Phase 3: Fix Initialization

- [x] Task: Refactor NewExecutionService to accept stores
  - [x] Change signature to `NewExecutionService(broadcaster OutputBroadcaster, agentStore *agents.Store, harnessStore *harness.Store)`
  - [x] Create resolver with stores in constructor
  - [x] Remove `SetResolver()` method
  - [x] Update `main.go` to pass stores to constructor
  - [x] Remove now-unnecessary `defaultAgentStore()` and `defaultHarnessStore()` calls from main
  - [x] Commit changes

## Phase 4: Add Validation

- [x] Task: Add agent model format validation at load time
  - [x] Add validation in `agents.ParseDefinition()` to check model contains `/`
  - [x] Return error if model format is invalid
  - [x] Add test for invalid model format
  - [x] Verify existing bundled agents pass validation
  - [x] Commit changes

## Phase 5: Update Tests

- [x] Task: Update executor service tests
  - [x] Remove tests for `LoadDefaultAgentConfigs` 
  - [x] Update `TestResolveAgentCommand` to use new signature
  - [x] Update `TestResolveAgentCommandFallback` to expect error instead of echo
  - [x] Update `TestResolveAgentCommandModelFormat` to work with new flow
  - [x] Update `TestExecuteTaskBroadcastsRunnerOutput` to use resolver-based setup
  - [x] Add test for harness binary not found error
  - [x] Test coverage: 66.7% (core logic 80%+; WebSocket handling not tested)
  - [x] Commit changes

## Phase 6: Verification

- [x] Task: Run all tests and verify build
  - [x] Run `go test ./...` - all tests pass
  - [x] Run `go build .` - builds successfully
  - [x] Update track plan status to complete
  - [x] Final commit
