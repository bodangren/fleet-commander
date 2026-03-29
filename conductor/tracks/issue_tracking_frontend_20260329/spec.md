# Specification - Issue Tracking Frontend

## Overview

Frontend components to display and manage issues in the dashboard. Issues are displayed in categorized columns with filter controls and quick actions.

## Functional Requirements

### FR1: IssueListView
- Fetch issues from GET /api/projects/{id}/issues
- Display in Kanban-style columns by type (blocker, delegation, clarification)
- Filter by status (open, resolved, duplicate)
- Quick action buttons: resolve, view details

### FR2: IssueDetailView  
- Display full issue content from markdown
- Status dropdown for changing status
- Link to task selector
- Created/Updated timestamps

### FR3: Issue Creation Modal
- Form with title, description, type dropdown
- Related task selector (optional)
- Submit creates issue via POST /api/projects/{id}/issues

## Acceptance Criteria

1. Issues displayed in categorized columns
2. Filter controls work correctly
3. Status updates via PATCH propagate to UI
4. Issue creation modal works end-to-end

## Out of Scope

- Comments/threads (tracked separately)
- Email notifications (tracked separately)