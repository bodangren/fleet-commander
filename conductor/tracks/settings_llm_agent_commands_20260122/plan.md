# Plan: Settings menu configures different llm agent command lines

## Phase 1: Agent template storage + IPC
- [x] Task: Define shared agent template types + IPC channels (84a1859)
  - [x] Write unit tests for new IPC_CHANNELS entries
  - [x] Implement shared types/interfaces for templates
- [ ] Task: Implement agent template persistence in main process
  - [ ] Write unit tests for load/save behavior (empty/malformed storage, round-trip)
  - [ ] Implement storage module using app userData path
- [ ] Task: Add main-process IPC handlers for get/set templates
  - [ ] Write unit tests for handler validation and persistence calls
  - [ ] Implement IPC handlers and registration
- [ ] Task: Expose template API in preload
  - [ ] Write preload tests for new API methods
  - [ ] Implement preload bridge methods
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Settings UI – list + CRUD
- [ ] Task: Add Settings tab view and wiring
  - [ ] Write renderer test that Settings view renders when selected
  - [ ] Implement Settings tab content entry point in App
- [ ] Task: Fetch and display template list
  - [ ] Write renderer tests for list rendering and empty state
  - [ ] Implement data loading and list UI (name + command)
- [ ] Task: Add template create/edit flows
  - [ ] Write renderer tests for add/edit interactions and save
  - [ ] Implement add/edit UI with name + command fields
- [ ] Task: Delete template flow
  - [ ] Write renderer tests for delete behavior
  - [ ] Implement delete action and persistence
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Validation + reorder
- [ ] Task: Validate required fields + {{task}} placeholder
  - [ ] Write renderer tests for validation errors and save blocking
  - [ ] Implement validation logic and user-facing errors
- [ ] Task: Reorder templates and persist order
  - [ ] Write renderer tests for reorder controls and saved ordering
  - [ ] Implement reorder UI controls and persistence
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)
