# Implementation Plan - Modular Code Refactoring

## Phase 1: main.go Route Extraction

- [x] Task: Extract project routes into `project_routes.go`
  - Move all `/api/projects/*` handlers to dedicated file
  - Keep route registration in `main.go`
  - Ensure imports compile

- [x] Task: Extract settings/config routes into `settings_routes.go`
  - Move `/api/settings` handlers
  - Move `applyConfigToRuntime` function

- [x] Task: Extract task execution routes into `task_routes.go`
  - Move `/api/projects/{id}/tasks/*` handlers
  - Move WebSocket handlers

## Phase 2: api_management.go Split

- [x] Task: Split `api_management.go` into domain files
  - `api_harnesses.go` - harness discovery and management
  - `api_agents.go` - agent management
  - `api_management.go` - shared helpers and struct only

- [x] Task: Update tests to match new file structure
  - Tests remain in `api_management_test.go` (no changes needed)
  - All tests pass

## Phase 3: orchestrator/run.go Extraction

- [x] Task: Extract broadcasting into `orchestrator/broadcast.go`
  - Moved `broadcastStatus`, `broadcastIssueCreated`

- [x] Task: Extract issue auto-creation into `orchestrator/issue_hooks.go`
  - Moved `createBlockerIssue` and added `createDelegationIssues`
  - Tests remain in `run_test.go`

## Phase 4: Frontend Page Refactoring

- [x] Task: Extract AgentEditorPage hooks into `useAgentForm.ts`
  - Form state management
  - Validation logic
  - API submission

- [x] Task: Extract HarnessEditorPage hooks into `useHarnessForm.ts`
  - Similar pattern to AgentEditor extraction

- [x] Task: Extract ProjectViewPage components
  - Extract modal components to separate files
  - Extract view mode logic to custom hooks

## Phase 5: Verification

- [x] Task: Run all tests
  - `go test ./...` passes

- [x] Task: Build verification
  - `go build .` succeeds

- [x] Task: Line count verification
  - All Go source files now under 400 lines
  - main.go: 286 lines (was 668)
  - api_management.go: 218 lines (was 498)
  - internal/orchestrator/run.go: 320 lines (was 416)
