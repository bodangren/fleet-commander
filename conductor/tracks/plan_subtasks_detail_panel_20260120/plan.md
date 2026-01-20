# Plan

## Phase 1: Parse + Render Sub-Tasks in Plan Detail Panel
- [ ] Task: Extend plan detail parsing to capture sub-tasks by indentation
  - [ ] Write tests for parsing indented checklist lines under Task entries
  - [ ] Implement sub-task parsing with indentation rule (Option B)
- [ ] Task: Render sub-tasks nested under parent tasks in the detail panel
  - [ ] Write component tests for sub-task rendering and nesting
  - [ ] Implement sub-task rendering with existing marker + input controls
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Parse + Render Sub-Tasks in Plan Detail Panel' (Protocol in workflow.md)

## Phase 2: Edit + Toggle Sub-Tasks with Auto-Save
- [ ] Task: Support sub-task marker toggles in the detail panel
  - [ ] Write tests for sub-task marker toggles and save dispatch
  - [ ] Implement sub-task marker toggles using plan content updates
- [ ] Task: Support sub-task title edits with auto-save
  - [ ] Write tests for sub-task title edits and save dispatch
  - [ ] Implement sub-task title edits with plan content updates
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Edit + Toggle Sub-Tasks with Auto-Save' (Protocol in workflow.md)

## Phase 3: Move Track Info Component to Tracks Tab
- [ ] Task: Move track info UI from Board tab to Tracks tab
  - [ ] Write UI tests for track info in Tracks tab (and absence in Board)
  - [ ] Implement track info relocation without changing content
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Move Track Info Component to Tracks Tab' (Protocol in workflow.md)
