# Implementation Plan - Kanban Board from Conductor + Git

## Phase 1: Data Model and Conductor Parsing [checkpoint: 2f99eb2]
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
- [x] Task: Conductor - User Manual Verification 'Phase 1: Data Model and Conductor Parsing' (Protocol in workflow.md) 2f99eb2

## Phase 2: IPC, Project Selection, and Refresh (Dogfood MVP) [checkpoint: f330e80]
Enable selecting a local project, validating it, and refreshing the board data.

- [x] Task: Implement IPC to select/load a project and refresh board data 8e4bbb6
    - [x] Write unit tests for IPC handlers (mock fs/git)
    - [x] Implement IPC handlers and preload API types
- [x] Task: Persist last-used project folder c405443
    - [x] Write unit tests for persistence helper
    - [x] Implement read/write in userData
- [x] Task: Conductor - User Manual Verification 'Phase 2: IPC, Project Selection, and Refresh (Dogfood MVP)' (Protocol in workflow.md) f330e80

## Phase 3: Board UI (Dogfood MVP) [checkpoint: 4d0abf0]
Render the board with filters/search and basic interactions for daily use.

- [x] Task: Build Board view layout with columns and task cards a3510ef
    - [x] Write component tests for Board rendering
    - [x] Implement Board view, loading/error/empty states
- [x] Task: Add filters, search, and refresh controls fa363aa
    - [x] Write tests for filter and search behavior
    - [x] Implement UI controls and filtering logic
- [x] Task: Conductor - User Manual Verification 'Phase 3: Board UI (Dogfood MVP)' (Protocol in workflow.md) 4d0abf0

## Phase 4: Git Enrichment and Inference [checkpoint: 953c74b]
Read git history/notes, enrich tasks with activity, and infer progress when needed.

- [x] Task: Read recent git commits and notes for a repository 468bbcb
    - [ ] Write unit tests for git log and notes parsing (mock output)
    - [ ] Implement git reader using local git commands
- [x] Task: Match git data to tasks and infer status adaa2d3
    - [ ] Write unit tests for task matching, inferred in-progress, and needs-sync flags
    - [ ] Implement matcher and enrichment logic
- [x] Task: Display inferred status and activity metadata f7c23a8
    - [ ] Write tests for badges and last-activity rendering
    - [ ] Implement inferred/needs-sync indicators and activity display
- [x] Task: Conductor - User Manual Verification 'Phase 4: Git Enrichment and Inference' (Protocol in workflow.md) 953c74b

## Phase 5: File Updates and Drag-and-Drop
Support moving tasks between columns and persisting the status to Conductor files.

- [x] Task: Update Conductor files when task status changes 808999f
    - [x] Write unit tests for plan.md updates, tracks.md updates, and metadata.json updates
    - [x] Implement safe file update helpers
- [x] Task: Add drag-and-drop interactions with status updates 27e5867
    - [x] Write tests for drag/drop behavior and IPC calls
    - [x] Implement drag/drop and optimistic updates
- [ ] Task: Conductor - User Manual Verification 'Phase 5: File Updates and Drag-and-Drop' (Protocol in workflow.md)
