# Plan: Settings menu configures different llm agent command lines

## Phase 1: Agent template storage + IPC [checkpoint: e767c2e]
- [x] Task: Define shared agent template types + IPC channels (84a1859)
  - [x] Write unit tests for new IPC_CHANNELS entries
  - [x] Implement shared types/interfaces for templates
- [x] Task: Implement agent template persistence in main process (2483ad0)
  - [x] Write unit tests for load/save behavior (empty/malformed storage, round-trip)
  - [x] Implement storage module using app userData path
- [x] Task: Add main-process IPC handlers for get/set templates (b84d37f)
  - [x] Write unit tests for handler validation and persistence calls
  - [x] Implement IPC handlers and registration
- [x] Task: Expose template API in preload (a8675ef)
  - [x] Write preload tests for new API methods
  - [x] Implement preload bridge methods
- [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md) (5af6d56)

## Phase 2: Settings UI – list + CRUD [checkpoint: 4e371c3]
- [x] Task: Add Settings tab view and wiring (2a86309)
  - [x] Write renderer test that Settings view renders when selected
  - [x] Implement Settings tab content entry point in App
- [x] Task: Fetch and display template list (f0238f7)
  - [x] Write renderer tests for list rendering and empty state
  - [x] Implement data loading and list UI (name + command)
- [x] Task: Add template create/edit flows (040a65f)
  - [x] Write renderer tests for add/edit interactions and save
  - [x] Implement add/edit UI with name + command fields
- [x] Task: Delete template flow (0333594)
  - [x] Write renderer tests for delete behavior
  - [x] Implement delete action and persistence
- [x] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md) (bf99196)

## Phase 3: Validation + reorder
- [x] Task: Validate required fields + {{task}} placeholder (dc05364)
  - [x] Write renderer tests for validation errors and save blocking
  - [x] Implement validation logic and user-facing errors
- [x] Task: Reorder templates and persist order (5e2fdbf)
  - [x] Write renderer tests for reorder controls and saved ordering
  - [x] Implement reorder UI controls and persistence
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)
