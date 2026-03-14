# Plan

## Phase 1: Parse + Render Sub-Tasks in Plan Detail Panel [checkpoint: 302599e]
- [x] Task: Extend plan detail parsing to capture sub-tasks by indentation (6fd8d93)
  - [x] Write tests for parsing indented checklist lines under Task entries
  - [x] Implement sub-task parsing with indentation rule (Option B)
- [x] Task: Render sub-tasks nested under parent tasks in the detail panel (b26b063)
  - [x] Write component tests for sub-task rendering and nesting
  - [x] Implement sub-task rendering with existing marker + input controls
- [x] Task: Conductor - User Manual Verification 'Phase 1: Parse + Render Sub-Tasks in Plan Detail Panel' (Protocol in workflow.md) (735c0e3)

## Phase 2: Edit + Toggle Sub-Tasks with Auto-Save [checkpoint: 146b946]
- [x] Task: Support sub-task marker toggles in the detail panel (b33a6ca)
  - [x] Write tests for sub-task marker toggles and save dispatch
  - [x] Implement sub-task marker toggles using plan content updates
- [x] Task: Support sub-task title edits with auto-save (b33a6ca)
  - [x] Write tests for sub-task title edits and save dispatch
  - [x] Implement sub-task title edits with plan content updates
- [x] Task: Conductor - User Manual Verification 'Phase 2: Edit + Toggle Sub-Tasks with Auto-Save' (Protocol in workflow.md) (e9b54ad)

## Phase 3: Move Track Info Component to Tracks Tab
- [x] Task: Move track info UI from Board tab to Tracks tab (32c5b7e)
  - [x] Write UI tests for track info in Tracks tab (and absence in Board)
  - [x] Implement track info relocation without changing content
- [x] Task: Conductor - User Manual Verification 'Phase 3: Move Track Info Component to Tracks Tab' (Protocol in workflow.md)
