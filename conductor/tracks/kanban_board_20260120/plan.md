# Implementation Plan - Kanban Board from Conductor + Git

## Phase 1: Data Model and Conductor Parsing
Define the core board data structures and parse Conductor files into normalized tasks.

- [x] Task: Define board data model and status mapping helpers e152295
    - [x] Write unit tests for status mapping and task normalization
    - [x] Implement shared types and mapping utilities
- [x] Task: Parse conductor/tracks.md for track list and status 2081edb
    - [x] Write unit tests for tracks.md parsing
    - [x] Implement tracks.md parser
- [x] Task: Parse conductor/tracks/<track_id>/plan.md for phases and tasks ab838b4
    - [x] Write unit tests for plan.md parsing and phase/task association
    - [x] Implement plan.md parser
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Data Model and Conductor Parsing' (Protocol in workflow.md)

## Phase 2: Git Enrichment and Inference
Read git history/notes, enrich tasks with activity, and infer progress when needed.

- [ ] Task: Read recent git commits and notes for a repository
    - [ ] Write unit tests for git log and notes parsing (mock output)
    - [ ] Implement git reader using local git commands
- [ ] Task: Match git data to tasks and infer status
    - [ ] Write unit tests for task matching, inferred in-progress, and needs-sync flags
    - [ ] Implement matcher and enrichment logic
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Git Enrichment and Inference' (Protocol in workflow.md)

## Phase 3: IPC, Persistence, and File Updates
Expose scanning and update operations via IPC, persist the last-used project, and update Conductor files on status changes.

- [ ] Task: Implement IPC to select/load a project and refresh board data
    - [ ] Write unit tests for IPC handlers (mock fs/git)
    - [ ] Implement IPC handlers and preload API types
- [ ] Task: Persist last-used project folder
    - [ ] Write unit tests for persistence helper
    - [ ] Implement read/write in userData
- [ ] Task: Update Conductor files when task status changes
    - [ ] Write unit tests for plan.md updates, tracks.md updates, and metadata.json updates
    - [ ] Implement safe file update helpers
- [ ] Task: Conductor - User Manual Verification 'Phase 3: IPC, Persistence, and File Updates' (Protocol in workflow.md)

## Phase 4: Board UI and Interactions
Build the Board view with filters, search, refresh, and drag-and-drop updates.

- [ ] Task: Build Board view layout with columns and task cards
    - [ ] Write component tests for Board rendering
    - [ ] Implement Board view, loading/error/empty states
- [ ] Task: Add filters, search, and refresh controls
    - [ ] Write tests for filter and search behavior
    - [ ] Implement UI controls and filtering logic
- [ ] Task: Add drag-and-drop interactions with status updates
    - [ ] Write tests for drag/drop behavior and IPC calls
    - [ ] Implement drag/drop and optimistic updates
- [ ] Task: Display inferred status and activity metadata
    - [ ] Write tests for badges and last-activity rendering
    - [ ] Implement inferred/needs-sync indicators and activity display
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Board UI and Interactions' (Protocol in workflow.md)
