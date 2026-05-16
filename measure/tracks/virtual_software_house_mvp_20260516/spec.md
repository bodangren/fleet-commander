# Virtual Software House MVP — Specification

## Overview

Rebuild Fleet Commander from an over-engineered orchestration control plane into a simple, approachable virtual software house. The product is a Scrum kanban board where AI employees work on projects.

## Goals

1. **Simplicity**: A new user understands the system in 5 minutes.
2. **Visibility**: The kanban board is the primary interface.
3. **Approachability**: No complex algorithms, no broker protocols, no 20-page dashboards.

## Non-Goals

- Multi-tenancy
- Enterprise RBAC
- Complex dispatcher scoring
- Real-time agent chat
- Plugin system

## User Stories

### As a user, I want to create projects so that I can organize work by client.

- Acceptance: Projects have a name, description, and status.
- Acceptance: I can see a list of all projects.

### As a user, I want a kanban board per project so that I can track task flow.

- Acceptance: Default columns: Backlog, Ready, In Progress, Review, Done.
- Acceptance: Tasks appear as cards with title, assignee, and priority.
- Acceptance: I can drag tasks between columns.

### As a user, I want to manage AI employees so that I can build my team.

- Acceptance: Employees have names, roles, skills, and model preferences.
- Acceptance: I can assign tasks to employees.
- Acceptance: Employees show workload status.

### As a user, I want tasks to execute automatically so that AI employees actually do the work.

- Acceptance: A scheduler picks up Ready tasks and runs the assigned employee.
- Acceptance: Execution output is captured in a run log.
- Acceptance: Failed tasks move to Blocked with an error note.

## Technical Constraints

- Keep Convex schema minimal and obvious.
- Frontend is a single-page app. No nested routing hell.
- Reuse existing Bun + React + Convex stack.
- Do not break existing Convex data that we want to keep.
