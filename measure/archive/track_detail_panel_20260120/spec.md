# Track Detail Panel (Plan Editor)

## Overview
Add a right-side detail panel that opens when a task card is clicked. The panel displays the track's `plan.md` and allows inline editing of task titles/headings and task checkbox markers, with auto-save to disk.

## Functional Requirements
1. Clicking a task card opens a right-side slide-over panel.
2. The panel loads and displays the selected track's `plan.md`.
3. The plan is rendered as editable phase headings and task items.
4. Users can edit:
   - Phase headings
   - Task titles
   - Task checkbox markers (`[ ]`, `[~]`, `[x]`)
5. Changes are auto-saved to `plan.md` on every edit.
6. If saving fails, an actionable error message is shown.
7. No explicit "Save" button is shown.

## Non-Functional Requirements
- Auto-save writes updates immediately and preserves valid Markdown structure.
- Plan content uses monospace typography.
- The editor remains responsive for typical plan sizes.

## Acceptance Criteria
- Clicking a task card opens a right-side panel with the correct track's `plan.md`.
- Editing a phase heading updates the heading in `plan.md` without breaking structure.
- Editing a task title updates the corresponding list item in `plan.md`.
- Toggling a checkbox updates the marker (`[ ]`, `[~]`, `[x]`) in `plan.md`.
- Changes are persisted without an explicit save action.
- Save failures surface a clear, actionable error message.

## Out of Scope
- Editing `spec.md`.
- Editing `metadata.json`.
- Adding or removing tasks or phases.
- Terminal or agent execution within the panel.
