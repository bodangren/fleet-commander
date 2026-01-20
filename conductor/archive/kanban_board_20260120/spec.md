# Spec: Project Kanban Board from Conductor + Git

## Overview
Add a Board view that loads a project folder, parses Conductor track and plan files plus git history/notes, and renders a kanban board of tasks with filtering, search, and drag-and-drop status updates. Git notes/commits enrich task cards and can infer In Progress when Conductor markers are not set.

## Functional Requirements

1. Project Folder Selection
   - User can select a project folder (system dialog) when the Board first loads.
   - The app validates the folder contains a git repo and a conductor/ directory.
   - The last-used folder is persisted and reloaded on app start.

2. Conductor Parsing
   - Parse conductor/tracks.md for track list and track-level status.
   - For each track, parse conductor/tracks/<track_id>/plan.md:
     - Phases: ## headings
     - Tasks: - [ ] Task: ..., - [~] Task: ..., - [x] Task: ...
   - Each task is associated with its track and phase.

3. Git Notes and Commit Enrichment
   - Read recent git commits and git notes (if present).
   - Map notes/commits to tasks by matching Task: lines in notes or matching task titles in commit messages.
   - Store last activity metadata (commit hash and timestamp) on matching tasks.

4. Status Resolution (Combined Logic)
   - Base status comes from Conductor markers:
     - [ ] -> To Do
     - [~] -> In Progress
     - [x] -> Done
   - If a task is [ ] but has a matching recent note/commit, mark it as In Progress (inferred) in the board UI (does not modify files).
   - Tasks with mismatched Conductor vs. git evidence show a small Needs Sync indicator.

5. Kanban Board UI
   - Three columns: To Do, In Progress, Done.
   - Task cards show: task title, track, phase, explicit vs. inferred status, and last activity.
   - Filters:
     - Track filter (single-select)
     - Phase filter (single-select, scoped by track)
   - Search by task title (live filter).
   - Refresh button re-parses Conductor files and git history/notes.

6. Drag-and-Drop Updates
   - Dragging a card between columns updates the task marker in the relevant plan.md.
   - If all tasks in a track become Done, update the track line in conductor/tracks.md to [x].
   - Update the track metadata.json status and updated_at timestamp.
   - No git commits are created automatically.

7. Error and Empty States
   - If the folder is missing conductor/ or git, show a clear error and allow reselect.
   - If no tracks/tasks exist, show a friendly empty state.

## Non-Functional Requirements
- Local-only; no network calls.
- Parsing is fast enough for typical projects (hundreds of tasks) without noticeable UI lag.
- No file modifications occur unless the user drags a task to a new column.

## Acceptance Criteria
- Board loads a chosen project folder and shows tasks grouped into To Do/In Progress/Done.
- Filters and search reduce visible tasks correctly.
- Refresh re-reads Conductor and git data.
- Drag-and-drop updates the correct plan.md marker and track status/metadata.
- Git notes/commits enrich tasks and can infer In Progress for unmarked tasks.

## Out of Scope
- Editing task text or creating tasks directly from the board.
- Automatic git commits/notes creation.
- Multi-project dashboards or cross-repo views.
