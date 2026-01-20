# Plan

## Phase 1: Plan Detail Data + IPC
- [x] Task: Load plan details for a track in the main process (d37664e)
  - [ ] Write unit tests for the plan detail loader (valid track, missing plan.md, invalid track link)
  - [ ] Implement a plan detail loader that resolves track paths and returns plan content
- [ ] Task: Add IPC channel and preload API for plan detail retrieval
  - [ ] Write IPC tests for plan detail request/response and error handling
  - [ ] Implement IPC handler in the main process
  - [ ] Implement preload bridge method for renderer access
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Plan Detail Data + IPC' (Protocol in workflow.md)

## Phase 2: Detail Panel UI + Rendering
- [ ] Task: Add right-side detail panel shell in the renderer
  - [ ] Write component tests for opening the panel from a task card click
  - [ ] Implement panel layout, open/close state, and selection handling
- [ ] Task: Render plan content in the detail panel
  - [ ] Write component tests for rendering phase headings and task rows with markers
  - [ ] Implement plan rendering with monospace typography and structured layout
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Detail Panel UI + Rendering' (Protocol in workflow.md)

## Phase 3: Editing + Auto-save
- [ ] Task: Toggle task markers with auto-save
  - [ ] Write tests for marker toggle interactions and save dispatch
  - [ ] Implement marker editing and auto-save to plan.md
- [ ] Task: Edit phase headings and task titles with auto-save
  - [ ] Write tests for text editing interactions and save dispatch
  - [ ] Implement inline editing for headings and task titles with auto-save
- [ ] Task: Surface save errors in the panel
  - [ ] Write tests for error messaging on save failure
  - [ ] Implement error state UI with actionable messaging
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Editing + Auto-save' (Protocol in workflow.md)
