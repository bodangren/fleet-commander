# Implementation Plan - Cleanup Agent/Harness Integration

## Phase 1: Remove Duplicates and Dead Code

- [ ] Task: Remove duplicate agent files from `internal/agents/defaults/*.md`
  - [ ] Delete architect.md, dispatcher.md, junior-dev.md, mid-dev.md, product-manager.md, reviewer.md, senior-backend.md, senior-frontend.md
  - [ ] Verify only files in `defaults/agents/` subdirectory remain
  - [ ] Commit changes

- [ ] Task: Remove hardcoded agent configs from ExecutionService
  - [ ] Remove `agentConfigs` field from `ExecutionService` struct
  - [ ] Remove `LoadDefaultAgentConfigs()` method
  - [ ] Remove `RegisterAgentConfig()` method
  - [ ] Remove `GetAgentConfig()` method
  - [ ] Remove `prepareArgs()` method
  - [ ] Update `main.go` to remove call to `LoadDefaultAgentConfigs()`
  - [ ] Commit changes

## Phase 2: Simplify Resolution Logic

- [ ] Task: Refactor resolveCommand to single-path resolution
  - [ ] Modify `resolveCommand()` to use resolver only
  - [ ] Return `(string, []string, error)` signature
  - [ ] Return clear error messages for:
    - Agent not found
    - Agent model format invalid
    - Harness not found
    - Harness binary not on PATH
  - [ ] Update `ExecuteTask()` to handle error from `resolveCommand()`
  - [ ] Commit changes

- [ ] Task: Add harness binary availability check
  - [ ] Add `exec.LookPath` check in `resolveCommand()` after harness lookup
  - [ ] Return descriptive error if binary not found
  - [ ] Add test for missing binary scenario
  - [ ] Commit changes

## Phase 3: Fix Initialization

- [ ] Task: Refactor NewExecutionService to accept stores
  - [ ] Change signature to `NewExecutionService(broadcaster OutputBroadcaster, agentStore *agents.Store, harnessStore *harness.Store)`
  - [ ] Create resolver with stores in constructor
  - [ ] Remove `SetResolver()` method
  - [ ] Update `main.go` to pass stores to constructor
  - [ ] Remove now-unnecessary `defaultAgentStore()` and `defaultHarnessStore()` calls from main
  - [ ] Commit changes

## Phase 4: Add Validation

- [ ] Task: Add agent model format validation at load time
  - [ ] Add validation in `agents.ParseDefinition()` to check model contains `/`
  - [ ] Return error if model format is invalid
  - [ ] Add test for invalid model format
  - [ ] Verify existing bundled agents pass validation
  - [ ] Commit changes

## Phase 5: Update Tests

- [ ] Task: Update executor service tests
  - [ ] Remove tests for `LoadDefaultAgentConfigs` 
  - [ ] Update `TestResolveAgentCommand` to use new signature
  - [ ] Update `TestResolveAgentCommandFallback` to expect error instead of echo
  - [ ] Update `TestResolveAgentCommandModelFormat` to work with new flow
  - [ ] Update `TestExecuteTaskBroadcastsRunnerOutput` to use resolver-based setup
  - [ ] Add test for harness binary not found error
  - [ ] Ensure test coverage >80%
  - [ ] Commit changes

## Phase 6: Verification

- [ ] Task: Run all tests and verify build
  - [ ] Run `go test ./...` - all tests pass
  - [ ] Run `go build .` - builds successfully
  - [ ] Run test coverage check - >80%
  - [ ] Update track plan status to complete
  - [ ] Final commit
