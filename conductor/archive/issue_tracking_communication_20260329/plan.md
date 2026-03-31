# Implementation Plan - Issue Tracking & Communication

## Phase 1: Issue Data Model & Storage

- [x] Task: Define issue data structures
  - [x] Create Issue model with YAML frontmatter support
  - [x] Implement issue file naming convention
  - [x] Add issue types enum

- [x] Task: Create issue store
  - [x] Implement issue file read/write
  - [x] Add list by project
  - [x] Add get by ID
  - [x] Implement status updates

## Phase 2: API Endpoints

- [x] Task: Implement issue CRUD endpoints
  - [x] POST /api/projects/{id}/issues - create new issue
  - [x] GET /api/projects/{id}/issues - list open issues
  - [x] GET /api/projects/{id}/issues/{issueId} - get issue details
  - [x] PATCH /api/projects/{id}/issues/{issueId} - update status
  - [ ] POST /api/projects/{id}/issues/{issueId}/link - link to task (NFR - can add later)

## Phase 3: Frontend

- [ ] Task: Create IssueListView component
  - [ ] Fetch and display issues by type
  - [ ] Filter controls
  - [ ] Quick action buttons

- [ ] Task: Create IssueDetailView component
  - [ ] Display issue content
  - [ ] Status dropdown
  - [ ] link to task selector

## Phase 4: Agent Integration

- [ ] Task: Add issue creation to orchestrator
  - [ ] Detect issue creation during agent execution
  - [ ] Write issue file atomically

- [ ] Task: Wire agent to issue system
  - [ ] Pass issue template to agent prompts
  - [ ] Collect issue output from agent

## Phase 5: Verification

- [x] Task: Run all tests and verify build
  - [x] Run `go test ./...` - all tests pass
  - [x] Run `go build .` - builds successfully
  - [ ] Update track plan status to complete