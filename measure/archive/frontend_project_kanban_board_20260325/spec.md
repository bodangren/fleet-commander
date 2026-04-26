# Specification - Frontend - Project Kanban Board

## 1. Goal
Provide a focused, interactive Kanban board view for a specific project. This view serves as the primary interface for users to oversee the AI agents' progress, understand current blockers, and manually adjust task priorities or statuses.

## 2. Context
While the Orchestrator Engine is fully automated, the human user needs a way to visualize the state of the project's `plan.md` files in real-time. The Kanban board translates the raw markdown lists into a familiar, drag-and-drop interface.

## 3. Architecture & Data Flow
- **Data Source:** The frontend calls `GET /api/projects/:id`, which returns the fully parsed state of the project (all tracks, phases, and tasks).
- **State Management:** The frontend flattens the nested structure (`Project -> Tracks -> Phases -> Tasks`) into a single list of tasks to render the columns.
- **Interactivity:**
  - When a user moves a task, the frontend must determine the new status.
  - It sends a `PATCH /api/projects/:id/tasks/:taskId` request.
  - The Go backend is responsible for updating the corresponding `plan.md` file on disk.
  - The Go `WatcherService` detects the file change, updates the in-memory model, and broadcasts an event (via SSE or WebSocket, to be implemented later) to refresh the UI.

## 4. UI/UX Requirements
- **Clear Information Hierarchy:** Task cards must clearly show who is assigned (`@agent`) and what track they belong to, as this context is lost when flattening the list.
- **Blocker Visibility:** The "Blocked (Broker)" column is critical. Tasks here need high visibility so the human user knows intervention may be required if an agent cannot resolve it automatically.
- **Manual Override:** The "Trigger Orchestrator Run" button allows the user to force the daemon to evaluate the board and dispatch an agent immediately, bypassing the normal schedule.