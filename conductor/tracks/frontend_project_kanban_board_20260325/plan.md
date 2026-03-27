# Implementation Plan - Frontend - Project Kanban Board

## Phase 1: Project Detail View & Data Fetching
- [x] Task: Create a `ProjectView` component mapped to the route `/project/:id`.
- [x] Task: Fetch full project details (including tracks and tasks) from the Go API (`GET /api/projects/:id`).
- [x] Task: Build the `ProjectHeader` component displaying the project name, path, and a manual "Trigger Orchestrator Run" button.

## Phase 2: Kanban Board Skeleton
- [x] Task: Implement drag-and-drop interactions for task cards and persist the selected lane.
- [x] Task: Create the `KanbanBoard` component.
- [x] Task: Define the four main columns: `Ready/Todo`, `In Progress`, `Blocked (Broker)`, and `Done`.
- [x] Task: Write logic to map the flat list of `Task`s from the API into their respective columns based on their `Status` field.

## Phase 3: Task Cards & Interactions
- [x] Task: Build a `TaskCard` Shadcn component. It should display:
  - Task Description
  - Priority Badge (if applicable)
  - Assigned Persona Badge (e.g., `@frontend` avatar)
  - Parent Track Name
- [x] Task: Implement styling to make tasks in the `Blocked` column visually distinct (e.g., a red border or glowing effect).
- [ ] Task: (Stretch) Add a click handler to `Blocked` tasks that fetches and displays the corresponding Issue Markdown file from the `broker/open/` directory.

## Phase 4: Board State Management
- [x] Task: Connect the Drag and Drop events. When a user drags a card to a new column, send a status update to the Go API to persist the change in the underlying `plan.md`.
- [x] Task: Ensure the UI updates optimistically, reverting if the API call fails.
