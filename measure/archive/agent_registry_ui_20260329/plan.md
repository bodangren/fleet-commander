# Implementation Plan - Agent Registry UI

## Phase 1: API Endpoints

- [x] Task: Add agent layer endpoints
  - [x] Implement PUT /api/agents/{name} with layer detection
  - [x] Add DELETE /api/agents/{name} with layer validation
  - [x] Implement POST /api/agents/{name}/clone with layer param
  - [x] Add POST /api/agents/{name}/reset endpoint

- [x] Task: Add agent testing endpoint
  - [x] Implement POST /api/agents/{name}/test handler
  - [x] Connect to ExecutionService for harness invocation

## Phase 2: Frontend Components

- [x] Task: Create AgentListView component
  - [x] List all agents with badges
  - [x] Add filter by layer
  - [x] Add clone/reset actions per row

- [x] Task: Create AgentEditView component
  - [x] System prompt textarea
  - [x] Model dropdown (populate from harness discovery)
  - [x] Temperature slider (0-2)
  - [x] Tool permissions checkboxes
  - [x] Save/Cancel buttons

## Phase 3: Integration

- [x] Task: Wire React components to API
  - [x] Fetch agent list on mount
  - [x] Save updates on submit
  - [x] Handle errors gracefully

- [x] Task: Connect test execution
  - [x] Stream output from WS endpoint
  - [x] Display in terminal-like component

## Phase 4: Verification

- [x] Task: Run all tests and verify build
  - [x] Run `go test ./...` - all tests pass
  - [x] Run `go build .` - builds successfully
  - [x] Run frontend tests
  - [x] Update track plan status to complete