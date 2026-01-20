# Plan

## Phase 1: Plan Detail Data + IPC [checkpoint: f07f98d]
- [x] Task: Load plan details for a track in the main process (d37664e)
  - [x] Write unit tests for the plan detail loader (valid track, missing plan.md, invalid track link)
  - [x] Implement a plan detail loader that resolves track paths and returns plan content
- [x] Task: Add IPC channel and preload API for plan detail retrieval (f6ef847)
  - [x] Write IPC tests for plan detail request/response and error handling
  - [x] Implement IPC handler in the main process
  - [x] Implement preload bridge method for renderer access
- [x] Task: Conductor - User Manual Verification 'Phase 1: Plan Detail Data + IPC' (Protocol in workflow.md) (58678c0)

## Phase 2: Detail Panel UI + Rendering [checkpoint: 55429cf]
- [x] Task: Add right-side detail panel shell in the renderer (76558b0)
  - [x] Write component tests for opening the panel from a task card click
  - [x] Implement panel layout, open/close state, and selection handling
- [x] Task: Render plan content in the detail panel (085df49)
  - [x] Write component tests for rendering phase headings and task rows with markers
  - [x] Implement plan rendering with monospace typography and structured layout
- [x] Task: Conductor - User Manual Verification 'Phase 2: Detail Panel UI + Rendering' (Protocol in workflow.md) (4830546)

## Phase 3: Editing + Auto-save
- [x] Task: Toggle task markers with auto-save (02c1bf3)
  - [x] Write tests for marker toggle interactions and save dispatch
  - [x] Implement marker editing and auto-save to plan.md
- [x] Task: Edit phase headings and task titles with auto-save (ff3c03c)
  - [x] Write tests for text editing interactions and save dispatch
  - [x] Implement inline editing for headings and task titles with auto-save
- [ ] Task: Surface save errors in the panel
  - [ ] Write tests for error messaging on save failure
  - [ ] Implement error state UI with actionable messaging
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Editing + Auto-save' (Protocol in workflow.md)
