# Specification - Issue Tracking & Communication

## Overview

Issue Tracking enables agents to create structured Issue files during execution to report blockers, spawn sub-tasks, or request help from other personas. Issues are stored as Markdown files in measure/issues/.

## Functional Requirements

### FR1: Issue Creation
- Agents can create Issue files during task execution
- Issue types: blocker, delegation, clarification, feature-request
- Each issue has: title, description, type, createdAt, relatedTask

### FR2: Issue Storage
- Store in measure/issues/{project_id}/
- File format: {issue-id}.md with YAML frontmatter
- Index in measure/tracks.md issues section

### FR3: Issue API
- List open issues per project
- Get issue by ID with full content
- Update issue status (open, resolved, duplicate)
- Link issues to tasks

### FR4: Issue Dashboard View
- Display issues in Kanban columns by type
- Filter by status, type, assignee
- Quick actions: resolve, link to task

## Acceptance Criteria

1. POST /api/projects/{id}/issues creates issue file
2. GET /api/projects/{id}/issues lists all open issues
3. Issues appear in UI in categorized columns
4. Agents can create issues during execution
5. Issue updates reflect in real-time on dashboard

## Out of Scope

- Email notifications for new issues (tracked separately)
- Issue comments/threads (tracked separately)