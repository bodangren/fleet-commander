# Plan Sub-Tasks in Detail Panel + Move Track Info to Tracks Tab

## Overview
Show sub-task checklist lines (indented under a Task in plan.md) inside the right-side plan detail panel, with the same editing and marker toggle controls as top-level tasks. Move the existing track info component from the Board tab to the Tracks tab without changing its content.

## Functional Requirements
1. The plan detail panel renders sub-tasks underneath their parent task.
2. Sub-tasks are detected only when a checklist line is indented beneath a `- [ ] Task: ...` line.
3. Sub-tasks show the same UI affordances as tasks: marker toggle + inline editable title.
4. All sub-tasks are shown (no truncation) in the plan detail panel.
5. Editing a sub-task title auto-saves to `plan.md`.
6. Toggling a sub-task marker auto-saves to `plan.md`.
7. The Board tab no longer displays the track info component.
8. The Tracks tab displays the same track info component that was previously shown in Board (no new data added).

## Non-Functional Requirements
- Preserve the existing Conductor file format; do not change `plan.md`/`spec.md` structure.
- Parsing must be resilient to other non-indented checklist lines (these should not be treated as sub-tasks).
- Maintain current auto-save error handling behavior.

## Acceptance Criteria
- Given a `plan.md` with indented checklist lines under a task, the plan detail panel shows them nested under that task.
- Sub-task titles can be edited and persist to disk.
- Sub-task markers can be toggled and persist to disk.
- Non-indented checklist lines are not treated as sub-tasks.
- The track info component appears on the Tracks tab and not on the Board tab.

## Out of Scope
- Creating, deleting, or reordering sub-tasks.
- Editing `spec.md` or `metadata.json`.
- Displaying sub-tasks on Board task cards.
