# Implementation Plan - Issue Tracking Frontend

## Phase 1: IssueListView

- [ ] Task: Create IssueListView component
  - [ ] Fetch issues from GET /api/projects/{id}/issues
  - [ ] Group by type columns
  - [ ] Add filter dropdowns

- [ ] Task: Add IssueCard component
  - [ ] Display title, type badge, status
  - [ ] Quick action buttons

## Phase 2: IssueDetailView

- [ ] Task: Create IssueDetailView/page
  - [ ] Full content display
  - [ ] Status dropdown
  - [ ] Link to task selector

## Phase 3: Issue Creation

- [ ] Task: Create IssueCreateModal
  - [ ] Title input
  - [ ] Description textarea  
  - [ ] Type dropdown
  - [ ] Related task selector
  - [ ] POST to API on submit

## Phase 4: Integration & Verification

- [ ] Task: Wire to project view
- [ ] Task: Run tests and verify build